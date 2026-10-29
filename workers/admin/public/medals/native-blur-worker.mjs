import {blurNative} from './native-blur-kernel.mjs';
self.onmessage = ({data}) => {
  try {
    const result = blurNative(new Uint8ClampedArray(data.pixels), data.width, data.height);
    self.postMessage(result, [result.pixels.buffer]);
  } catch (error) { self.postMessage({error: error.message}); }
};
