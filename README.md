# Gro-Vision

Gro-Vision scans a photo for multiple grocery packages and suggests the closest product variants, including brand, flavor, package type, and size.

## Run

```bash
pnpm install
pnpm --filter @workspace/gro-vision run dev
```

Open the project preview and choose a supplied product photo or upload a JPG, PNG, or WebP image. The first scan downloads the pretrained vision model into the browser.

## MVP vision approach

The app uses Hugging Face Transformers.js with pretrained OWL-ViT zero-shot object detection. It searches for multiple packages in one image using grocery-catalog prompts, then suppresses overlapping duplicate boxes.

The attached product photos are sample inputs, not fine-tuning examples. Six images are not enough to train or evaluate a dependable SKU detector across real store conditions. OWL-ViT scores are ranking signals, not calibrated probabilities; precise flavor, size, or variant can remain uncertain when packaging text is too small or obscured. The user can correct a suggested SKU in the interface.

## Roadmap

1. Multi-package scan, SKU suggestions, bounding boxes, and manual correction.
2. OCR and barcode support, then saved product/inventory lists.
3. A larger, labeled real-store dataset, fine-tuning, and measured validation before making accuracy claims.
