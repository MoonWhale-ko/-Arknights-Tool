# Dynamic illustration background restoration checkpoint

Date: 2026-10-30. No Unity effect renderer has been shipped.

## Confirmed from the KR Android resource bundles

- `arts/dynchars/char_1012_skadi2_2.ab`: Spine model, 3D meshes, particle systems, materials, action bindings, camera size and UI adjustments.
- `arts/dynchars/effect.ab`: shared effects.
- `[uc]shaders.ab`: the actual L2D shader dependency (CAB-1b70e77fd118dea4a32415ac87839ac6). The ordinary `shaders/` directory alone does not supply this dependency.
- `[uc]uishaders.ab` and `arts/[pack]common.ab` are also available for further dependency checks.
- Skadi uses seven L2D shaders: AlphaBlend, Additive, Skeleton-AlphaSplit, Dissolve AB, Dissolve AB UVTween, Dissolve Add (VertexColor Major), and Dissolve Add UVTween.
- Shader programs are compressed. GLES3 platform 9 contains GLSL source after LZ4 decompression; Vulkan platform 18 contains binary programs. UnityPy's plain ShaderLab export omits those programs and is not directly runnable.
- The Skadi prefab has camera size 11, maximum size 2048x2048, and action-specific particles. These values have not yet been converted into a browser renderer.

## Remaining work

1. Export the prefab hierarchy, particle curves, mesh transforms, material texture references and GLSL programs into a coherent scene description.
2. Implement the required particle/material behavior alongside Spine. Preserve native draw order, alpha splitting, additive composition, dissolve and UV movement.
3. Compare against a same-version in-game recording before claiming the background is restored. A 40–60 second recording of Skadi E2, including Idle, Special and a tap response, is needed as the visual acceptance reference.
4. Check desktop/mobile rendering and memory. Runtime pose validation is not a GPU or mobile performance benchmark.

## Already shipped separately

All 96 Spine resources parse; 92 match the current wardrobe catalog. Four extensionless JSON models and six case/name mismatches were fixed. Major motions were sampled at 30fps. Their union bounds enlarge the drawing surface without shrinking the settled pose, and do not claim exact native framing or Unity particle parity.
