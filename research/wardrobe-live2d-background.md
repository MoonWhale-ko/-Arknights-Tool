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

### Original raster registration after visual comparison

The native camera frame alone made Mizuki smaller than the static raster. It is retained as `nativeCameraFrame`, but does not establish identical framing to the original PNG. A same-viewport comparison matched 163 original scene features using SIFT/RANSAC. A uniform scale/translation fit (rotation deliberately omitted) had median residual 0.58 screen px and 95th-percentile residual 1.40 px. This gives the per-model display `frame`, approximately 2046.5 square units. It is an image-based registration of the original geometry, not an invented visual adjustment; moving body parts still differ by animation pose. Exporting the ambient data preserves this registration.

Effect scene requests now carry an explicit version, so returning browsers do not retain the pre-particle scene JSON while loading updated JavaScript. This does not restore the omitted large distortion or action effects.

### PC Mizuki particle application (2026-10-30)

The user-provided Windows bundle (`8737e9a70f3761bc98ae0ba23696c134`) was parsed and converted with `scripts/export_mizuki_particles.py`. It exports 24 original additive point/box systems (the previous two ambient systems plus 22 action systems), five original PNG textures, controller action bindings, native start/root delays, looping flags, lifetime/color/size curves, and BoneFollower attachments. Special/interact effects remain dormant until the corresponding Spine motion starts. Non-looping emitters stop spawning after their native duration and can replay on a subsequent action. The ambient bubble now follows its original Mizuki_Bubble bone.

Thirty other active systems are explicitly excluded in scene.json: unresolved external textures, distortion/dissolve shaders, UV sheets, noise, forces/velocity, stretched/mesh particles, or unsupported shapes. Uploaded effect.ab matches the PC manifest hash, but the Mizuki bundle does not; its external CAB dependencies cannot be assumed to match this shared bundle. Main illustration geometry and prior backgrounds are retained. This is partial playback support, not full Unity equivalence. RGBA8 material baking still clamps HDR colors.

Validation: 120 admin tests pass, including action delays/replay and 10 simulated seconds for each exported system. Preview build succeeds. Browser visual checks are recorded separately after deployment.

### Curl noise and independent ocean alignment

Mizuki now exports 27 systems, including glow01_dm, guangdian_dm and guan1_dm with original NoiseModule settings. The web runtime computes curl from deterministic gradient Perlin potentials and reads native strength curves, frequency, damping, octaves, octave multiplier/scale, quality, scroll, remapping and position/rotation/size amounts. Supported local linear velocity curves and scalar velocity limits are included. Unity's proprietary sampling/seed and integration details are not recovered: field phase and limiter damping are an approximation, not bit-identical Unity output. Other noise-bearing systems remain excluded when their separate shader, UV, shape or dependency requirements are unsupported.

The hai_dm ocean quad is registered independently to the original 2048² illustration using SIFT/RANSAC: six accepted feature matches, median fit residual 0.37 source pixels. Previously the quad center was about 58 reference pixels too low and 70 too far right, with a slight tilt. Only the ocean's four vertices change; character/frame/other layers retain their existing geometry. Calibration statistics describe matched features, not an independent full-image fidelity score. scene.json keeps both original vertices and registration data. Stable texture-ID filenames avoid old indexed texture cache collisions.

Validation: 123 admin tests pass; preview build succeeds. Noise tests check deterministic/coherent sampling, zero-strength behavior, damping, octave/axis settings and actual changed particle paths.

Noise behavior references: https://docs.unity.cn/kr/2023.1/Manual/PartSysNoiseModule.html and https://docs.unity3d.com/2021.3/Documentation/ScriptReference/ParticleSystem.NoiseModule.html .

### Mizuki upper-right distortion and ocean contour (2026-10-31)

The upper-right iridescent effect is separate from ParticleSystem.NoiseModule. Two previously excluded rigid renderers, sekuai_dm and sekua3_dm, use the original Disturb Anchor (AlphaBlend) shader. Each has 35 vertices and varying vertex alpha, including fully transparent perimeter vertices. Both are now exported with original positions, triangles, tiling, MainColor, alpha control, anchors, strengths, UVTween and sorting order 20. The original GLES default-variant equations are retained as shader-90.frag provenance and ported to the Canvas material path. The distortion field scrolls at the original -0.08/-0.10 UV units per second. Canvas texture updates target 20 Hz; other rendering remains at the existing frame rate.

The missing dependency was resolved through the PC V074 manifest: arts/maps/effect.ab contains CAB-d000ef0c36c1f8ec9df1698fde86d5b2, Texture2D path ID 3598337627453241146 (TX_WaterNoise). This is not arts/dynchars/effect.ab. The exact CAB and PPtr are resolved by the exporter; no procedural or substituted map is used. inspect_resource_manifest.py records the dependency-lookup method for future models. PC bundle source: 26-10-26-09-55-20_a543a9; GLES shader source: KR Android 26-10-26-10-31-28_9f22b2.

The ocean's contour uses the original 2048² illustration alpha as a separate reference clip, sampled in registered illustration coordinates at 1024×512 bake resolution. This is a site-side boundary correction using the original illustration, not a claim to have recovered Unity's original scene mask. Character placement stays unchanged. Explicit clamp/repeat sampling and barycentric vertex-alpha interpolation prevent wrapped edge artifacts and rectangular rainbow layers.

Validation: all 127 admin tests pass and preview build succeeds. Tests cover anchor displacement order, varying vertex alpha, edge clamping, original map identity and both native meshes. Browser checks follow deployment.

### Distortion performance and visibility correction (2026-10-31)

The native parsed shader pass confirms SrcAlpha / OneMinusSrcAlpha color blending; legacy material SrcBlend values are not authoritative. The foreground anchored layers now use a WebGL mesh shader when the character renderer supports WebGL, with original mesh alpha, texture orientation/wrap, tiling, red-channel displacement and time. Output is premultiplied for Pixi's normal blending. Canvas backgrounds remain separate.

To address the user's weak-effect report, the site multiplies displacement by 1.25 and opacity by 1.3. These are deliberate presentation adjustments, not newly recovered native values; scene.json retains original values and animation periods. Character placement and ocean contour remain unchanged.

The software fallback uses 160px moving textures, computes bilinear indices once, samples only the noise red channel, avoids per-pixel anchor RGBA allocations and skips fully transparent mesh pixels. A warmed 30-update Node synthetic 256px-source benchmark measured approximately 70ms/update before and 13ms/update after on this executor. This measures texture computation, not browser FPS, device performance, loading, or full scene rendering. Actual WebGL validation requires a GPU-capable browser; software fallback remains available.
