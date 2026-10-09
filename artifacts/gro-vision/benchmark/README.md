# Gro-Vision benchmark v1

## Run it

From the workspace root:

```sh
pnpm --filter @workspace/gro-vision run benchmark
```

The script invokes the same `detectGroceryProducts` function as the app, runs the six fixed sample images in order, prints a concise JSON summary, and writes the full result to `benchmark/results/latest.json`. It uses the same pretrained `Xenova/owlvit-base-patch32` model, 19 catalog prompts, and 0.075 detection threshold as the app.

## Labels and scoring

- `src/lib/benchmark-data.ts` contains the v1 scene list and object boxes, normalized to image width and height.
- The six supplied example photos are the whole v1 test set. Four are single-item scenes; two of the six scenes contain multiple products.
- Boxes are scored class-agnostically at intersection-over-union (IoU) ≥ 0.50, greedily matched one-to-one by highest IoU.
- Detection precision and recall are reported overall and by scene. Catalog identity and sample-mapped SKU accuracy are separate from box localization. Per-product precision and recall count only correct exact catalog IDs.
- `skuVerified` and `sizeVerified` identify independent ground truth visible in the image. A missed verified item counts as incorrect. Assumed sample-to-catalog sizes do not count toward verified size accuracy.
- `ignore` boxes cover objects that are out of the current catalog or lack a defensible exact-SKU label. Predictions overlapping those boxes are omitted from false-positive counts.

## Captured baseline

On 2026-10-09, native ONNX Runtime localized all 9 scored packages (precision 100%, recall 100%, mean IoU 0.833) but returned the expected catalog SKU for only 3/9 (33%). It got 0/1 independently verified exact SKU and 0/1 verified numeric size correct. SKU results by scene: glass bottle 1/1, single Coke can 0/1, assorted cans 1/5, 1.5 L PET bottle 0/1, Pepsi can 1/1. The bottle row with unknown large-format sizes has no scorable SKU targets. Full per-scene and per-product precision/recall is in `results/latest.json`.

This is a smoke-test baseline, not a representative retail validation set. All six supplied images use bright studio lighting and plain backgrounds. They cover cans, glass, PET, single products, and multi-item scenes, but do not cover varied real-world lighting, occlusion, or viewpoints. Several product/size targets come from the demo catalog mapping rather than a barcode; only the Coca-Cola 1.5 L PET image visibly confirms both the exact catalog SKU and its numeric size. Those verification flags are preserved in the report so unverified labels are not presented as exact-size ground truth.

The browser run was also attempted, but its WebAssembly ONNX runtime fails to create a session for the model graph (`Cast(13)`). The reported baseline therefore measures the same detector code with Node's native ONNX Runtime, not browser execution; browser model compatibility remains a separate blocker.

## Ground-truth limits and decision

Keep OWL-ViT as the inexpensive prototype reference, but do not expand the catalog or fine-tune from this result. The box/SKU gap indicates the current catalog-prompt path is not reliable enough for exact product identification, while one verified SKU is too little evidence to train against. First confirm exact product labels and fix browser runtime compatibility, then gather a held-out set with real lighting, viewpoints, occlusion, packaging, and multiple items before comparing model or fine-tuning options.
