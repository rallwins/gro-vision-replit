import { CATALOG, productByLabel, type BoundingBox, type ModelProgress, type ProductDetection } from './catalog';

type ModelImage = HTMLImageElement | Blob | string;
type RegionResult = {
  label: string;
  score: number;
  box: { xmin?: number; ymin?: number; xmax?: number; ymax?: number };
};
type ClassificationResult = { label: string; score: number };
type RegionDetector = (
  image: Blob | string,
  prompts: string[],
  options?: Record<string, unknown>,
) => Promise<RegionResult[]>;
type ProductClassifier = (
  images: Blob[],
  labels: string[],
  options?: Record<string, unknown>,
) => Promise<ClassificationResult[][] | ClassificationResult[]>;
type RegionCandidate = { score: number; box: BoundingBox };
type RankedProduct = { product: (typeof CATALOG)[number]; score: number };

const REGION_PROMPT = 'grocery product package. beverage can. bottle. toothpaste tube. snack bag. noodle packet. food carton.';
const MAX_REGIONS = 24;
const CLASSIFICATION_BATCH_SIZE = 6;
let detectorPromise: Promise<RegionDetector> | null = null;
let classifierPromise: Promise<ProductClassifier> | null = null;

function modelProgress(
  modelName: string,
  onProgress: (progress: ModelProgress) => void,
) {
  return (event: { status?: string; progress?: number }) => {
    const status = event.status === 'progress'
      ? `Downloading ${modelName}`
      : event.status === 'done' || event.status === 'ready'
        ? `Loading ${modelName}`
        : event.status || `Loading ${modelName}`;
    onProgress({ status, progress: typeof event.progress === 'number' ? event.progress : undefined });
  };
}

async function loadDetector(onProgress: (progress: ModelProgress) => void): Promise<RegionDetector> {
  if (!detectorPromise) {
    detectorPromise = (async () => {
      const { pipeline, env } = await import('@huggingface/transformers');
      env.allowLocalModels = false;
      env.useBrowserCache = true;
      return await pipeline(
        'zero-shot-object-detection',
        'onnx-community/grounding-dino-tiny-ONNX',
        {
          device: 'wasm',
          dtype: 'q8',
          session_options: { executionProviders: ['wasm'] },
          progress_callback: modelProgress('package detector', onProgress),
        },
      ) as unknown as RegionDetector;
    })().catch((error: unknown) => {
      detectorPromise = null;
      throw error;
    });
  }
  return detectorPromise;
}

async function loadClassifier(onProgress: (progress: ModelProgress) => void): Promise<ProductClassifier> {
  if (!classifierPromise) {
    classifierPromise = (async () => {
      const { pipeline, env } = await import('@huggingface/transformers');
      env.allowLocalModels = false;
      env.useBrowserCache = true;
      return await pipeline(
        'zero-shot-image-classification',
        'Xenova/clip-vit-base-patch32',
        {
          device: 'wasm',
          dtype: 'q8',
          session_options: { executionProviders: ['wasm'] },
          progress_callback: modelProgress('product matcher', onProgress),
        },
      ) as unknown as ProductClassifier;
    })().catch((error: unknown) => {
      classifierPromise = null;
      throw error;
    });
  }
  return classifierPromise;
}

const area = (box: BoundingBox) => Math.max(0, box.xmax - box.xmin) * Math.max(0, box.ymax - box.ymin);

function intersectionArea(a: BoundingBox, b: BoundingBox) {
  return Math.max(0, Math.min(a.xmax, b.xmax) - Math.max(a.xmin, b.xmin))
    * Math.max(0, Math.min(a.ymax, b.ymax) - Math.max(a.ymin, b.ymin));
}

function overlapRatio(a: BoundingBox, b: BoundingBox) {
  const intersection = intersectionArea(a, b);
  const union = area(a) + area(b) - intersection;
  return union > 0 ? intersection / union : 0;
}

function suppressDuplicates(candidates: RegionCandidate[], threshold = 0.48) {
  const accepted: RegionCandidate[] = [];
  for (const candidate of [...candidates].sort((a, b) => b.score - a.score)) {
    if (!accepted.some((kept) => overlapRatio(candidate.box, kept.box) > threshold)) {
      accepted.push(candidate);
    }
  }
  return accepted;
}

function selectPackageRegions(
  detections: RegionResult[],
  imageWidth: number,
  imageHeight: number,
): RegionCandidate[] {
  const imageArea = imageWidth * imageHeight;
  const candidates = detections
    .map((detection): RegionCandidate | null => {
      const box = detection.box;
      if (!box) return null;
      const normalized: BoundingBox = {
        xmin: Math.max(0, Math.min(imageWidth, box.xmin ?? 0)),
        ymin: Math.max(0, Math.min(imageHeight, box.ymin ?? 0)),
        xmax: Math.max(0, Math.min(imageWidth, box.xmax ?? 0)),
        ymax: Math.max(0, Math.min(imageHeight, box.ymax ?? 0)),
      };
      if (area(normalized) < imageArea * 0.001) return null;
      return { score: detection.score, box: normalized };
    })
    .filter((candidate): candidate is RegionCandidate => candidate !== null);

  const unique = suppressDuplicates(candidates);
  // Grounding DINO can return one wide box around an entire shelf. Drop it only
  // when several smaller, distinct package boxes are already present inside it.
  const focused = unique.filter((candidate) => {
    const candidateArea = area(candidate.box);
    const widthRatio = (candidate.box.xmax - candidate.box.xmin) / imageWidth;
    if (candidateArea / imageArea < 0.3 || widthRatio < 0.8) return true;
    const containedRegions = unique.filter((other) => {
      const otherArea = area(other.box);
      return other !== candidate
        && otherArea * 2.5 < candidateArea
        && intersectionArea(candidate.box, other.box) / otherArea > 0.92;
    });
    return containedRegions.length < 4;
  });

  return suppressDuplicates(focused).slice(0, MAX_REGIONS);
}

async function loadImageElement(source: ModelImage): Promise<{ image: HTMLImageElement; objectUrl?: string }> {
  if (typeof HTMLImageElement !== 'undefined' && source instanceof HTMLImageElement) {
    return { image: source };
  }

  const objectUrl = source instanceof Blob ? URL.createObjectURL(source) : undefined;
  const image = new Image();
  image.crossOrigin = 'anonymous';
  image.src = objectUrl ?? source as string;
  try {
    await image.decode();
  } catch (error) {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    throw error;
  }
  return { image, objectUrl };
}

function cropRegion(image: HTMLImageElement, box: BoundingBox): Promise<Blob> {
  const left = Math.max(0, Math.floor(box.xmin));
  const top = Math.max(0, Math.floor(box.ymin));
  const width = Math.min(image.naturalWidth, Math.ceil(box.xmax)) - left;
  const height = Math.min(image.naturalHeight, Math.ceil(box.ymax)) - top;
  if (width < 1 || height < 1) return Promise.reject(new Error('The detected package has an invalid crop.'));

  const scale = Math.min(1, 512 / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext('2d');
  if (!context) return Promise.reject(new Error('Could not prepare a product crop for matching.'));
  context.drawImage(image, left, top, width, height, 0, 0, canvas.width, canvas.height);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Could not prepare a product crop for matching.'));
    }, 'image/jpeg', 0.92);
  });
}

function rankProducts(results: ClassificationResult[]): RankedProduct[] {
  const unique = new Map<string, RankedProduct>();
  for (const result of results) {
    const product = productByLabel(result.label);
    if (!product || !Number.isFinite(result.score)) continue;
    const previous = unique.get(product.id);
    if (!previous || result.score > previous.score) unique.set(product.id, { product, score: result.score });
  }
  return [...unique.values()].sort((a, b) => b.score - a.score);
}

function classifyUncertainty(ranked: RankedProduct[]) {
  const best = ranked[0];
  const alternative = ranked[1];
  if (!best || !alternative) return { uncertainSize: false, uncertainIdentity: false, alternatives: [] as string[] };

  const closeMatch = best.score - alternative.score < 0.1;
  const sameIdentity = best.product.brand === alternative.product.brand
    && best.product.variant === alternative.product.variant
    && best.product.packageType === alternative.product.packageType;
  const uncertainSize = closeMatch && sameIdentity && best.product.size !== alternative.product.size;
  const uncertainIdentity = best.score < 0.22 || (closeMatch && !sameIdentity);
  const alternatives = closeMatch ? ranked.slice(1, 4).map((item) => item.product.id) : [];
  return { uncertainSize, uncertainIdentity, alternatives };
}

/**
 * Grounding DINO proposes package regions; CLIP ranks those crops against the
 * grocery catalog. Both models run locally with WebAssembly and use the browser
 * cache, so the selected photo is never sent to an inference server.
 */
export async function detectGroceryProducts(
  image: ModelImage,
  onProgress: (progress: ModelProgress) => void,
): Promise<ProductDetection[]> {
  const { image: sourceImage, objectUrl } = await loadImageElement(image);
  try {
    onProgress({ status: 'Preparing package detector' });
    const detector = await loadDetector(onProgress);
    onProgress({ status: 'Finding package regions' });
    const detectorImage = image instanceof HTMLImageElement ? image.currentSrc || image.src : image;
    const raw = await detector(detectorImage, [REGION_PROMPT], { threshold: 0.15, top_k: 80 });
    const regions = selectPackageRegions(raw, sourceImage.naturalWidth, sourceImage.naturalHeight);
    if (regions.length === 0) return [];

    onProgress({ status: `Preparing ${regions.length} package crops` });
    const crops = await Promise.all(regions.map((region) => cropRegion(sourceImage, region.box)));
    const classifier = await loadClassifier(onProgress);
    const labels = CATALOG.map((product) => product.modelLabel);
    const classifications: ClassificationResult[][] = [];

    for (let start = 0; start < crops.length; start += CLASSIFICATION_BATCH_SIZE) {
      const batch = crops.slice(start, start + CLASSIFICATION_BATCH_SIZE);
      onProgress({ status: `Matching packages ${start + 1}–${start + batch.length} of ${crops.length}` });
      const result = await classifier(batch, labels, { top_k: 5 });
      if (result.length > 0 && Array.isArray(result[0])) {
        classifications.push(...result as ClassificationResult[][]);
      } else {
        classifications.push(result as ClassificationResult[]);
      }
    }

    const matches: (ProductDetection | null)[] = regions.map((region, index) => {
      const ranked = rankProducts(classifications[index] ?? []);
      const match = ranked[0];
      if (!match) return null;
      const uncertainty = classifyUncertainty(ranked);
      return {
        id: `detection-${index + 1}`,
        productId: match.product.id,
        label: match.product.modelLabel,
        score: match.score,
        box: region.box,
        alternatives: uncertainty.alternatives,
        uncertainSize: uncertainty.uncertainSize,
        uncertainIdentity: uncertainty.uncertainIdentity,
      };
    });

    return matches
      .filter((item): item is ProductDetection => item !== null)
      .sort((a, b) => a.box.ymin - b.box.ymin || a.box.xmin - b.box.xmin)
      .map((item, index) => ({ ...item, id: `detection-${index + 1}` }));
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}
