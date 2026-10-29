// globalgamemanagers.assets pathID 21, MobileBlur passes 0/1/2.
// GraphicUtil.ShotBlurredCamera (Torappu.Common.dll), see docs/medals-blur-trace-ko.md.
export const BLUR_WEIGHTS = Object.freeze([.0205, .0855, .232, .324, .232, .0855, .0205]);
export function roundToEven(value) {
  const floor = Math.floor(value), fraction = value - floor;
  return fraction === .5 ? floor + (floor % 2) : Math.round(value);
}
export function nativeBlurConfig(width, height) {
  if (![width, height].every(v => Number.isInteger(v) && v >= 2)) throw new RangeError('Invalid capture dimensions');
  const blurSize = Math.max(1, roundToEven(4 * Math.min(Math.max(width, height) / 1920, Math.min(width, height) / 1080)));
  return {width: Math.floor(width / 2), height: Math.floor(height / 2), blurSize, iterations: 3, steps: [0, 1, 2].map(i => blurSize / 2 + i)};
}
const clamp = (v, max) => Math.max(0, Math.min(max - 1, v));
function sample(data, w, h, x, y, channel) {
  x = clamp(x, w); y = clamp(y, h);
  const left = Math.floor(x), top = Math.floor(y), fx = x - left, fy = y - top;
  const a = (top * w + left) * 4 + channel, right = left < w - 1 ? 4 : 0, down = top < h - 1 ? w * 4 : 0;
  return (data[a] * (1 - fx) + data[a + right] * fx) * (1 - fy) + (data[a + down] * (1 - fx) + data[a + down + right] * fx) * fy;
}
// Pass 0: four samples at half-texel offsets. LINEAR sampling and CLAMP edges.
export function downsampleNative(data, width, height) {
  if (data.length !== width * height * 4) throw new RangeError('Invalid capture buffer');
  const config = nativeBlurConfig(width, height), w = config.width, h = config.height, out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const sx = (x + .5) * width / w - .5, sy = (y + .5) * height / h - .5, p = (y * w + x) * 4;
    for (let c = 0; c < 4; c++) out[p + c] = (sample(data,width,height,sx-.5,sy-.5,c) + sample(data,width,height,sx+.5,sy-.5,c) + sample(data,width,height,sx-.5,sy+.5,c) + sample(data,width,height,sx+.5,sy+.5,c)) / 4;
  }
  return out;
}
// Passes 1/2: seven RGB taps; source shader preserves the center sample's alpha.
export function blurNativePass(data, width, height, step, vertical) {
  const out = new Uint8ClampedArray(data.length), max = vertical ? height : width;
  // Precompute bilinear indices; this keeps the worker responsive on large captures.
  const taps = Array.from({length: max}, (_, p) => BLUR_WEIGHTS.map((weight, i) => {
    const at = clamp(p + (i - 3) * step, max), lo = Math.floor(at);
    return [lo, Math.min(max - 1, lo + 1), at - lo, weight];
  }));
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const p = (y * width + x) * 4, line = taps[vertical ? y : x];
    for (let c = 0; c < 3; c++) {
      let sum = 0;
      for (const [lo, hi, mix, weight] of line) {
        const a = vertical ? (lo * width + x) * 4 + c : (y * width + lo) * 4 + c;
        const b = vertical ? (hi * width + x) * 4 + c : (y * width + hi) * 4 + c;
        sum += (data[a] * (1 - mix) + data[b] * mix) * weight;
      }
      out[p + c] = sum;
    }
    out[p + 3] = data[p + 3];
  }
  return out;
}
export function blurNative(data, width, height) {
  const config = nativeBlurConfig(width, height);
  let pixels = downsampleNative(data, width, height);
  for (const step of config.steps) {
    pixels = blurNativePass(pixels, config.width, config.height, step, true);
    pixels = blurNativePass(pixels, config.width, config.height, step, false);
  }
  return {pixels, ...config};
}
