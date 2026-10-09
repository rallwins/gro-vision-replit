---
name: Browser ONNX model compatibility
description: Known Transformers.js browser model compatibility constraints and a verified local inference alternative.
---

Avoid the current OWL-ViT/OWLv2 ONNX exports for browser inference in this project: `Cast(13)` at `/class_head/Cast` fails session creation with both WASM and WebGPU, including after explicitly selecting WASM and pinning ONNX Runtime Web 1.30. Grounding DINO's ONNX export works with WASM when candidate labels are passed as one caption array entry; use it for generic region proposals and CLIP on image crops for catalog matching.

**Why:** The Cast failure persisted across backend, dtype, and runtime-version attempts. A real multi-item browser scan verified the alternative path.

**How to apply:** When changing browser vision models, verify full inference in the target browser. For Grounding DINO, keep the caption batch size at one and separate product matching from region detection.
