# Gro-Vision

A browser-based grocery product scanner that detects multiple packages in a photo and suggests product variants such as brand, flavor, package type, and size.

## Run & Operate

- `pnpm --filter @workspace/gro-vision run dev` — run the Gro-Vision web app
- `pnpm --filter @workspace/gro-vision run typecheck` — typecheck the web app
- `PORT=5000 BASE_PATH=/ pnpm --filter @workspace/gro-vision run build` — build the web app with artifact runtime settings
- The first scan loads the pretrained vision model in the browser; allow the initial model download to finish.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Web: React + Vite
- Vision: Transformers.js with pretrained OWL-ViT zero-shot object detection

## Where things live

- `artifacts/gro-vision/` — scanner UI, browser-side detection, product catalog, and sample images
- `lib/api-spec/` and `artifacts/api-server/` — shared workspace scaffold; Gro-Vision does not use a backend in this MVP

## Architecture decisions

- Run inference in the browser so uploaded photos do not need to be sent to a server.
- Use open-vocabulary OWL-ViT prompts for MVP package and SKU matching instead of claiming that six example photos are enough to fine-tune a reliable retail detector.
- Model scores are ranking signals, not calibrated probabilities; size and variant must remain marked uncertain when packaging text is not legible.

## Product

- Upload or choose a sample photo, identify multiple visible packages, review bounding boxes and candidates, and correct an SKU suggestion.
- The attached samples demonstrate the workflow; they are not a substitute for a diverse, annotated training and evaluation dataset.
- Next phases: OCR/barcodes and saved inventory; then a larger labeled real-store dataset, fine-tuning, and measured validation.

## User preferences

- The user requested the project name `gro-vision` and GitHub repository `rallwins/gro-vision-replit`.

## Gotchas

- First-time browser model downloads can be large and may take a while on a slow connection.
- Zero-shot SKU matches are approximate, especially for nearly identical package sizes and variants.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
