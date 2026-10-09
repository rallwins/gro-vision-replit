import { CATALOG, productByLabel, type BoundingBox, type ModelProgress, type ProductDetection } from './catalog';

type OwlResult = {
  label: string;
  score: number;
  box: { xmin?: number; ymin?: number; xmax?: number; ymax?: number; x_min?: number; y_min?: number; x_max?: number; y_max?: number };
};

type OwlPipeline = (image: HTMLImageElement | Blob | string, labels: string[], options?: Record<string, unknown>) => Promise<OwlResult[]>;
type Candidate = {
  product: (typeof CATALOG)[number];
  label: string;
  score: number;
  box: BoundingBox;
  alternatives?: string[];
  uncertainSize?: boolean;
  uncertainIdentity?: boolean;
};
let detectorPromise: Promise<OwlPipeline> | null = null;

async function loadDetector(onProgress: (progress: ModelProgress) => void): Promise<OwlPipeline> {
  if (!detectorPromise) {
    detectorPromise = (async () => {
      const { pipeline, env } = await import('@huggingface/transformers');
      env.allowLocalModels = false;
      env.useBrowserCache = true;
      return await pipeline(
        'zero-shot-object-detection',
        'Xenova/owlvit-base-patch32',
        {
          progress_callback: (event: { status?: string; progress?: number; file?: string }) => {
            const status = event.status === 'progress' ? 'Downloading vision model' : event.status || 'Loading vision model';
            onProgress({ status, progress: typeof event.progress === 'number' ? event.progress : undefined });
          },
        },
      ) as unknown as OwlPipeline;
    })().catch((error: unknown) => {
      detectorPromise = null;
      throw error;
    });
  }
  return detectorPromise;
}

const area = (box: BoundingBox) => Math.max(0, box.xmax - box.xmin) * Math.max(0, box.ymax - box.ymin);
function overlapRatio(a: BoundingBox, b: BoundingBox) {
  const intersection = Math.max(0, Math.min(a.xmax, b.xmax) - Math.max(a.xmin, b.xmin))
    * Math.max(0, Math.min(a.ymax, b.ymax) - Math.max(a.ymin, b.ymin));
  const union = area(a) + area(b) - intersection;
  return union > 0 ? intersection / union : 0;
}

/**
 * Runs pretrained OWL-ViT zero-shot object detection against the supplied image.
 * The model is loaded lazily, cached for later scans, and competing overlapping
 * SKU labels are suppressed while distinct package boxes are retained.
 */
export async function detectGroceryProducts(
  image: HTMLImageElement | Blob | string,
  onProgress: (progress: ModelProgress) => void,
): Promise<ProductDetection[]> {
  onProgress({ status: 'Preparing model' });
  const detector = await loadDetector(onProgress);
  onProgress({ status: 'Reading packages' });
  const raw = await detector(image, CATALOG.map((product) => product.modelLabel), { threshold: 0.075 });
  const candidates: Candidate[] = raw
    .map((detection) => {
      const product = productByLabel(detection.label);
      const box = detection.box;
      if (!product || !box) return null;
      const normalized: BoundingBox = {
        xmin: box.xmin ?? box.x_min ?? 0,
        ymin: box.ymin ?? box.y_min ?? 0,
        xmax: box.xmax ?? box.x_max ?? 0,
        ymax: box.ymax ?? box.y_max ?? 0,
      };
      const maxCoord = Math.max(normalized.xmax, normalized.ymax);
      if (maxCoord <= 1) {
        normalized.xmin *= 1000; normalized.ymin *= 1000; normalized.xmax *= 1000; normalized.ymax *= 1000;
      }
      if (area(normalized) < 90) return null;
      return { product, label: detection.label, score: detection.score, box: normalized };
    })
    .filter((item): item is Candidate => item !== null)
    .sort((a, b) => b.score - a.score);

  const accepted: typeof candidates = [];
  for (const candidate of candidates) {
    // OWL-ViT may return the same physical package for several catalog prompts.
    // Keep one box per object while retaining competing SKU guesses for review.
    const overlap = accepted.find((kept) => overlapRatio(candidate.box, kept.box) > 0.6);
    if (!overlap) {
      accepted.push(candidate);
      continue;
    }
    if (candidate.product.id !== overlap.product.id) {
      overlap.alternatives = [...(overlap.alternatives ?? []), candidate.product.id];
      const sameIdentity = candidate.product.brand === overlap.product.brand
        && candidate.product.variant === overlap.product.variant
        && candidate.product.packageType === overlap.product.packageType;
      if (sameIdentity) overlap.uncertainSize = true;
      else overlap.uncertainIdentity = true;
    }
  }

  return accepted
    .sort((a, b) => a.box.ymin - b.box.ymin || a.box.xmin - b.box.xmin)
    .map((item, index) => ({
      id: `detection-${index + 1}`,
      productId: item.product.id,
      label: item.label,
      score: item.score,
      box: item.box,
      alternatives: item.alternatives,
      uncertainSize: item.uncertainSize,
    }));
}
