# Dynamic illustration background restoration checkpoint

Date: 2026-10-30. The first rigid-mesh background pass is implemented for Skadi E2.

## Confirmed from the KR Android resource bundles

- `arts/dynchars/char_1012_skadi2_2.ab`: Spine model, 3D meshes, particle systems, materials, action bindings, camera size and UI adjustments.
- `arts/dynchars/effect.ab`: shared effects.
- `[uc]shaders.ab`: the actual L2D shader dependency (CAB-1b70e77fd118dea4a32415ac87839ac6). The ordinary `shaders/` directory alone does not supply this dependency.
- `[uc]uishaders.ab` and `arts/[pack]common.ab` are also available for further dependency checks.
- Skadi uses seven L2D shaders: AlphaBlend, Additive, Skeleton-AlphaSplit, Dissolve AB, Dissolve AB UVTween, Dissolve Add (VertexColor Major), and Dissolve Add UVTween.
- Shader programs are compressed. GLES3 platform 9 contains GLSL source after LZ4 decompression; Vulkan platform 18 contains binary programs. UnityPy's plain ShaderLab export omits those programs and is not directly runnable.
- The Skadi prefab has camera size 11, maximum size 2048x2048, and action-specific particles. Mesh transforms are now converted relative to the Spine root at 100 model units per Unity world unit. Camera size is retained in the exported scene metadata.

## Implemented first pass

- Exporter: `scripts/export_illust_background.py` extracts three rigid meshes (anhong, anlan, hongxian_02), their four original textures, and two GLES material fragments.
- Preserve relative placement, rotation, scale, UV scale/offset, native tint, dissolve threshold/border and additive/alpha composition. The foreground material's UV scroll is taken from its original MonoBehaviour.
- Use the existing Pixi renderer; background layers follow the same settled-pose framing as Spine. Mode switching pauses both, and leaving the skin releases effect resources.
- GPU uses the ported material fragments with premultiplied output. Canvas fallback evaluates the same RGBA8 material equations, bakes static layers once, and updates dissolve at 8fps.
- Verified the three-layer Canvas path in the deployed browser without effect errors. The browser has no WebGL context, so GPU shader/pixel verification remains pending.
- Enabled by default for `char_1012_skadi2#2`; `?effects=0` disables the first pass for diagnostics.

## Remaining work

1. Particle emitter simulation, noise/forces, trails and the skinned ribbon mesh are not included in the rigid-mesh pass.
2. Exact in-game framing/composition comparison and desktop/mobile GPU performance checks are still pending. An in-game recording is optional verification input, not a prerequisite to reading native coordinates.
3. Other operators' Unity effect scenes must be exported and checked individually before enabling them.

## Already shipped separately

All 96 Spine resources parse; 92 match the current wardrobe catalog. Four extensionless JSON models and six case/name mismatches were fixed. Major motions were sampled at 30fps. Their union bounds enlarge the drawing surface without shrinking the settled pose, and do not claim exact native framing or Unity particle parity.
