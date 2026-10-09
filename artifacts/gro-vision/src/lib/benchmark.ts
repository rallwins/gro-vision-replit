import { productById, type ProductDetection } from './catalog';
import { BENCHMARK_SCENES, type BenchmarkItem, type BenchmarkScene } from './benchmark-data';

export type Counts = {
  truth: number;
  predictions: number;
  localized: number;
  falsePositives: number;
  missed: number;
  identityCorrect: number;
  skuCorrect: number;
  skuVerified: number;
  verifiedSkuCorrect: number;
  sizeVerified: number;
  sizeCorrect: number;
  iouTotal: number;
};

export type BenchmarkRow = Counts & {
  id: string;
  label: string;
  precision: number;
  recall: number;
  f1: number;
  identityAccuracy: number;
  skuAccuracy: number;
  verifiedSkuAccuracy: number;
  sizeAccuracy: number | null;
  meanIou: number;
};

export type BenchmarkReport = {
  model: string;
  iouThreshold: number;
  completedAt: string;
  summary: BenchmarkRow;
  scenes: BenchmarkRow[];
  products: BenchmarkRow[];
  ignoredItems: number;
  verifiedSizeItems: number;
  verifiedSkuItems: number;
};

export type SceneRun = {
  scene: BenchmarkScene;
  detections: ProductDetection[];
  width: number;
  height: number;
};

const IOU_THRESHOLD = 0.5;
const emptyCounts = (): Counts => ({
  truth: 0,
  predictions: 0,
  localized: 0,
  falsePositives: 0,
  missed: 0,
  identityCorrect: 0,
  skuCorrect: 0,
  skuVerified: 0,
  verifiedSkuCorrect: 0,
  sizeVerified: 0,
  sizeCorrect: 0,
  iouTotal: 0,
});

function iou(a: ProductDetection['box'], b: ProductDetection['box']) {
  const intersection = Math.max(0, Math.min(a.xmax, b.xmax) - Math.max(a.xmin, b.xmin))
    * Math.max(0, Math.min(a.ymax, b.ymax) - Math.max(a.ymin, b.ymin));
  const areaA = Math.max(0, a.xmax - a.xmin) * Math.max(0, a.ymax - a.ymin);
  const areaB = Math.max(0, b.xmax - b.xmin) * Math.max(0, b.ymax - b.ymin);
  const union = areaA + areaB - intersection;
  return union > 0 ? intersection / union : 0;
}

function expectedBox(item: BenchmarkItem, width: number, height: number): ProductDetection['box'] {
  return {
    xmin: item.box[0] * width,
    ymin: item.box[1] * height,
    xmax: item.box[2] * width,
    ymax: item.box[3] * height,
  };
}

function sameIdentity(predictedId: string, truth: BenchmarkItem) {
  const product = productById(predictedId);
  return !!product
    && product.brand === truth.brand
    && product.variant === truth.variant
    && product.packageType === truth.packageType;
}

function metricRow(id: string, label: string, counts: Counts): BenchmarkRow {
  const precision = counts.predictions ? counts.localized / counts.predictions : 0;
  const recall = counts.truth ? counts.localized / counts.truth : 0;
  const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0;
  return {
    ...counts,
    id,
    label,
    precision,
    recall,
    f1,
    identityAccuracy: counts.localized ? counts.identityCorrect / counts.localized : 0,
    skuAccuracy: counts.truth ? counts.skuCorrect / counts.truth : 0,
    verifiedSkuAccuracy: counts.skuVerified ? counts.verifiedSkuCorrect / counts.skuVerified : 0,
    sizeAccuracy: counts.sizeVerified ? counts.sizeCorrect / counts.sizeVerified : null,
    meanIou: counts.localized ? counts.iouTotal / counts.localized : 0,
  };
}

function scoreScene(run: SceneRun) {
  const scorableTruth = run.scene.items.filter((item) => !item.ignore && item.productId);
  const ignoredTruth = run.scene.items.filter((item) => item.ignore);
  const matches: { prediction: ProductDetection; truth: BenchmarkItem; overlap: number }[] = [];
  const usedPredictions = new Set<number>();
  const usedTruth = new Set<number>();
  const possible = scorableTruth.flatMap((truth, truthIndex) => run.detections
    .map((prediction, predictionIndex) => ({
      truth,
      truthIndex,
      prediction,
      predictionIndex,
      overlap: iou(prediction.box, expectedBox(truth, run.width, run.height)),
    }))
    .filter((pair) => pair.overlap >= IOU_THRESHOLD))
    .sort((a, b) => b.overlap - a.overlap);

  for (const pair of possible) {
    if (usedTruth.has(pair.truthIndex) || usedPredictions.has(pair.predictionIndex)) continue;
    usedTruth.add(pair.truthIndex);
    usedPredictions.add(pair.predictionIndex);
    matches.push({ prediction: pair.prediction, truth: pair.truth, overlap: pair.overlap });
  }

  const ignoredPredictions = new Set<number>();
  run.detections.forEach((prediction, predictionIndex) => {
    if (ignoredTruth.some((truth) => iou(prediction.box, expectedBox(truth, run.width, run.height)) >= IOU_THRESHOLD)) {
      ignoredPredictions.add(predictionIndex);
    }
  });

  const eligiblePredictions = run.detections.filter((_, index) => !ignoredPredictions.has(index));
  const localized = matches.length;
  const counts = emptyCounts();
  counts.truth = scorableTruth.length;
  counts.predictions = eligiblePredictions.length;
  counts.localized = localized;
  counts.falsePositives = Math.max(0, eligiblePredictions.length - localized);
  counts.missed = Math.max(0, scorableTruth.length - localized);

  for (const match of matches) {
    const detectedProduct = productById(match.prediction.productId);
    const identityCorrect = sameIdentity(match.prediction.productId, match.truth);
    const skuCorrect = match.prediction.productId === match.truth.productId;
    counts.identityCorrect += Number(identityCorrect);
    counts.skuCorrect += Number(skuCorrect);
    counts.iouTotal += match.overlap;
    if (match.truth.skuVerified) counts.verifiedSkuCorrect += Number(skuCorrect);
    if (match.truth.sizeVerified && match.truth.size) counts.sizeCorrect += Number(detectedProduct?.size === match.truth.size);
  }
  for (const item of scorableTruth) {
    if (item.skuVerified) counts.skuVerified += 1;
    if (item.sizeVerified && item.size) counts.sizeVerified += 1;
  }
  return { counts, matches, eligiblePredictions };
}

export function evaluateBenchmarkRuns(
  runs: SceneRun[],
  completedAt = new Date().toISOString(),
): BenchmarkReport {
  const summaryCounts = emptyCounts();
  const productCounts = new Map<string, Counts>();
  const sceneRows = runs.map((run) => {
    const result = scoreScene(run);
    for (const key of Object.keys(summaryCounts) as (keyof Counts)[]) {
      summaryCounts[key] += result.counts[key];
    }
    for (const item of run.scene.items.filter((entry) => !entry.ignore && entry.productId)) {
      const product = productById(item.productId!);
      if (!product) continue;
      const current = productCounts.get(product.id) ?? emptyCounts();
      current.truth += 1;
      if (item.skuVerified) current.skuVerified += 1;
      if (item.sizeVerified && item.size) current.sizeVerified += 1;
      const match = result.matches.find((entry) => entry.truth.id === item.id);
      if (match) {
        const skuCorrect = match.prediction.productId === item.productId;
        current.localized += Number(skuCorrect);
        current.identityCorrect += Number(skuCorrect);
        current.skuCorrect += Number(skuCorrect);
        current.iouTotal += match.overlap * Number(skuCorrect);
        if (item.skuVerified) current.verifiedSkuCorrect += Number(skuCorrect);
        if (item.sizeVerified && item.size) current.sizeCorrect += Number(productById(match.prediction.productId)?.size === item.size);
      }
      current.missed = current.truth - current.localized;
      productCounts.set(product.id, current);
    }
    for (const prediction of result.eligiblePredictions) {
      const predictionProduct = productById(prediction.productId);
      if (!predictionProduct) continue;
      const predictedProduct = productCounts.get(prediction.productId) ?? emptyCounts();
      predictedProduct.predictions += 1;
      const correctMatch = result.matches.some((match) =>
        match.prediction.id === prediction.id && match.truth.productId === prediction.productId);
      if (!correctMatch) predictedProduct.falsePositives += 1;
      productCounts.set(prediction.productId, predictedProduct);
    }
    return metricRow(run.scene.id, run.scene.title, result.counts);
  });

  const products = [...productCounts.entries()]
    .map(([id, counts]) => {
      const product = productById(id);
      return metricRow(
        id,
        product ? `${product.brand} ${product.variant} · ${product.packageType} · ${product.size}` : id,
        counts,
      );
    })
    .sort((a, b) => a.label.localeCompare(b.label));
  const evaluatedCount = runs.reduce((sum, run) => sum + run.scene.items.filter((item) => !item.ignore && item.productId).length, 0);
  const verifiedSizeItems = runs.reduce((sum, run) => sum + run.scene.items.filter((item) => !item.ignore && item.sizeVerified).length, 0);
  const verifiedSkuItems = runs.reduce((sum, run) => sum + run.scene.items.filter((item) => !item.ignore && item.skuVerified).length, 0);

  return {
    model: 'Xenova/owlvit-base-patch32 · OWL-ViT zero-shot · Node ONNX Runtime',
    iouThreshold: IOU_THRESHOLD,
    completedAt,
    summary: metricRow('all', 'All scored items', summaryCounts),
    scenes: sceneRows,
    products,
    ignoredItems: runs.reduce((sum, run) => sum + run.scene.items.filter((item) => item.ignore).length, 0),
    verifiedSizeItems: Math.min(verifiedSizeItems, evaluatedCount),
    verifiedSkuItems: Math.min(verifiedSkuItems, evaluatedCount),
  };
}

export async function runBenchmark(
  detect: (image: HTMLImageElement) => Promise<ProductDetection[]>,
  onScene: (scene: BenchmarkScene) => void,
): Promise<BenchmarkReport> {
  const runs: SceneRun[] = [];
  for (const scene of BENCHMARK_SCENES) {
    onScene(scene);
    const image = new Image();
    image.src = scene.image;
    await image.decode();
    runs.push({
      scene,
      detections: await detect(image),
      width: image.naturalWidth,
      height: image.naturalHeight,
    });
  }
  return evaluateBenchmarkRuns(runs);
}
