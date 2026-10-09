import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const libDir = path.join(packageDir, 'src', 'lib');
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const generatedFiles = [
  '.benchmark-catalog.mjs',
  '.benchmark-data.mjs',
  '.benchmark-detector.mjs',
  '.benchmark-engine.mjs',
].map((name) => path.join(scriptDir, name));

function compileTypescript(source, outputName, replacements = []) {
  let output = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
    reportDiagnostics: true,
  });
  const error = output.diagnostics?.find((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error);
  if (error) throw new Error(ts.flattenDiagnosticMessageText(error.messageText, '\n'));
  let text = output.outputText;
  for (const [from, to] of replacements) text = text.replaceAll(from, to);
  return writeFile(path.join(scriptDir, outputName), text);
}

try {
  const [catalogSource, dataSource, detectorSource, engineSource] = await Promise.all([
    readFile(path.join(libDir, 'catalog.ts'), 'utf8'),
    readFile(path.join(libDir, 'benchmark-data.ts'), 'utf8'),
    readFile(path.join(libDir, 'detector.ts'), 'utf8'),
    readFile(path.join(libDir, 'benchmark.ts'), 'utf8'),
  ]);

  await Promise.all([
    compileTypescript(catalogSource, '.benchmark-catalog.mjs'),
    compileTypescript(dataSource, '.benchmark-data.mjs'),
  ]);
  await Promise.all([
    compileTypescript(detectorSource, '.benchmark-detector.mjs', [["'./catalog'", "'./.benchmark-catalog.mjs'"]]),
    compileTypescript(engineSource, '.benchmark-engine.mjs', [
      ["'./catalog'", "'./.benchmark-catalog.mjs'"],
      ["'./benchmark-data'", "'./.benchmark-data.mjs'"],
    ]),
  ]);

  const [{ detectGroceryProducts }, { evaluateBenchmarkRuns }, { BENCHMARK_SCENES }] = await Promise.all([
    import(pathToFileURL(generatedFiles[2]).href),
    import(pathToFileURL(generatedFiles[3]).href),
    import(pathToFileURL(generatedFiles[1]).href),
  ]);

  const runs = [];
  for (const [index, scene] of BENCHMARK_SCENES.entries()) {
    process.stdout.write(`Scanning ${index + 1}/${BENCHMARK_SCENES.length}: ${scene.title}\n`);
    const imagePath = path.join(packageDir, 'public', scene.image.replace(/^\//, ''));
    const detections = await detectGroceryProducts(imagePath, () => undefined);
    runs.push({ scene, detections, width: scene.width, height: scene.height });
  }

  const report = evaluateBenchmarkRuns(runs);
  const outputPath = path.join(packageDir, 'benchmark', 'results', 'latest.json');
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  const percent = (value) => `${(value * 100).toFixed(1)}%`;
  const summary = {
    model: report.model,
    completedAt: report.completedAt,
    detection: {
      precision: percent(report.summary.precision),
      recall: percent(report.summary.recall),
      meanIoU: report.summary.meanIou.toFixed(3),
    },
    catalogSku: `${report.summary.skuCorrect}/${report.summary.truth} (${percent(report.summary.skuAccuracy)})`,
    brandVariantIdentity: `${report.summary.identityCorrect}/${report.summary.localized} (${percent(report.summary.identityAccuracy)})`,
    verifiedSku: `${report.summary.verifiedSkuCorrect}/${report.summary.skuVerified}`,
    verifiedSize: `${report.summary.sizeCorrect}/${report.summary.sizeVerified}`,
    scenes: report.scenes.map((scene) => ({
      scene: scene.label,
      boxes: scene.truth,
      detectionPrecision: scene.truth ? percent(scene.precision) : 'not scored',
      detectionRecall: scene.truth ? percent(scene.recall) : 'not scored',
      catalogSku: scene.truth ? `${scene.skuCorrect}/${scene.truth}` : 'not scored',
      size: scene.sizeAccuracy === null ? 'unverified' : `${scene.sizeCorrect}/${scene.sizeVerified}`,
    })),
    products: report.products.map((product) => ({
      product: product.label,
      groundTruth: product.truth,
      skuPrecision: percent(product.precision),
      skuRecall: product.truth ? percent(product.recall) : 'no targets',
      verifiedSize: product.sizeAccuracy === null ? 'unverified' : `${product.sizeCorrect}/${product.sizeVerified}`,
    })),
  };
  process.stdout.write(`\nSaved full report to ${path.relative(packageDir, outputPath)}\n`);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
} finally {
  await Promise.all(generatedFiles.map((file) => rm(file, { force: true })));
}
