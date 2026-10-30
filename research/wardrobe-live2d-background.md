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
- Both GPU and Canvas now use the same baked RGBA8 material path with stock mesh materials. Static layers are baked once and dissolve updates at 8fps. The unverified custom GPU fragment path was removed from runtime. Original fragments remain available as provenance.
- Verified the three-layer Canvas path in the deployed browser without effect errors. The browser has no WebGL context; stock GPU mesh rendering and performance still require device verification.
- Enabled by default for `char_1012_skadi2#2`; `?effects=0` disables the first pass for diagnostics.

## Remaining work

1. Particle emitter simulation, noise/forces, trails and the skinned ribbon mesh are not included in the rigid-mesh pass.
2. Exact in-game framing/composition comparison and desktop/mobile GPU performance checks are still pending. An in-game recording is optional verification input, not a prerequisite to reading native coordinates.
3. Other operators' Unity effect scenes must be exported and checked individually before enabling them.

## Already shipped separately

All 96 Spine resources parse; 92 match the current wardrobe catalog. Four extensionless JSON models and six case/name mismatches were fixed. Major motions were sampled at 30fps. Their union bounds enlarge the drawing surface without shrinking the settled pose, and do not claim exact native framing or Unity particle parity.

## 2026-10-30: conservative multi-model rigid-layer application

- Added native scene exporter `scripts/export_illust_scene.py`. Primary illustration is selected from its original SkeletonData, rather than from a hardcoded transform ID. Coordinates use the original skeleton scale and complete native transform hierarchy.
- New profiles: Mizuki / Summer Feast (`char_437_mizuki@sale#7`), 2 of 7 rigid meshes; Rosmontis E2 (`char_391_rosmon#2`), 1 of 5 rigid meshes. Existing Skadi E2 retains its 3 layers. This is **3 profiles, 6 rigid meshes**, not complete background restoration for 96 models.
- Exported `scene.json` records every omitted mesh and its reason. Inactive branches, Unity transform animation, unsupported distortion, varying vertex color, external mesh dependencies, and unsupported BoneFollower hierarchies are excluded. Kroos Sale14 and Chen2 Summer20 produced no safely supported layers and are not enabled.
- General renderer supports a direct-child native BoneFollower position/rotation/local-scale/flip binding. New exported profiles currently have no eligible bone-bound rigid meshes; the binding math has unit coverage, but this does not claim a visually validated bone-bound scene.
- Added native Dissolve Add UVTween material scrolling and additive blend selection. Static background texture baking preserves up to 1024 pixels instead of the former universal 256 limit; animated material baking stays capped at 256 and 8 Hz. Native textures are retained unchanged on disk.
- Canvas drawing surface includes rigid background mesh extents while retaining the settled character scale and anchor.
- Remaining: distortion shader families, varying vertex colors, native Animator clips, particles, trails, skinned effects, postprocessing, and additional profiles. The previous 75/21 inventory grouping is an implementation classification, not a count of restored models.

### Missing background reported on the public site

The user reported a missing Mizuki background while the character rendered correctly. Public scene JSON and original PNGs returned HTTP 200; the previous browser verification used the Canvas renderer, so it did not establish WebGL behavior on the user's device. The exact device-side failure was not captured.

Background meshes now render into a dedicated transparent Pixi CanvasRenderer behind the character canvas. The character retains its existing renderer; original foreground effects retain their native stage/blend placement. Background canvases share the illustration's viewport and grayscale wrapper, follow its visibility/ticker, and are destroyed on skin changes. Effect asset URLs resolve from `import.meta.url` for both the public repository subpath and private preview. This is a compatibility correction, not a claim that all native effects are restored.

### Mizuki placement and first ambient particle systems

- The settled Spine bounds were being centred in the static image rectangle. This discards the original transparent margin and can shift the character when switching modes. Mizuki Summer Feast now uses the original `_cameraSize` (12), skeleton world Y (-8), and SkeletonData scale (.01): a camera frame of approximately x=-1200, y=-2000, width=2400, height=2400. Other models retain their previous frame until separately checked.
- Added only the original active `shui2_dm` and `xx2_dm` billboard systems. Their original textures, transforms, constant emission rates, initial bursts, population caps, lifetime/size curves and independently timed color/alpha gradients are exported from the native bundle. Point/box shapes and unweighted Hermite curves are supported; other ambient systems and special/interaction effects are still omitted.
- Reproduction: `python scripts/export_mizuki_ambient.py RESOURCE_ROOT`. No generated decorative textures or invented motion paths are used. Native random spawning is nondeterministic; tests inject deterministic random values to check lifetime, motion and population limits.
