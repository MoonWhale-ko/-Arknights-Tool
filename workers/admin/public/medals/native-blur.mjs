// Freeze the rendered native scene, then run the recovered MobileBlur passes.
const assets = new Map();
function dataURL(url) {
  if (url.startsWith('data:')) return Promise.resolve(url);
  const absolute = new URL(url, location.href).href;
  if (!assets.has(absolute)) assets.set(absolute, fetch(absolute).then(r => {
    if (!r.ok) throw Error('Blur capture asset unavailable');
    return r.blob();
  }).then(blob => new Promise((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(blob);
  })).catch(error => { assets.delete(absolute); throw error; }));
  return assets.get(absolute);
}
async function inlineURLs(value) {
  const matches = [...value.matchAll(/url\(["']?([^"')]+)["']?\)/g)];
  for (const match of matches) value = value.replace(match[0], 'url("' + await dataURL(match[1]) + '")');
  return value;
}
const styles = ['display','position','inset','left','right','top','bottom','width','height','min-width','min-height','max-width','max-height','margin','padding','box-sizing','overflow','overflow-x','overflow-y','background','background-color','background-image','background-size','background-position','background-repeat','color','opacity','visibility','transform','transform-origin','clip-path','mask-image','mask-size','mask-repeat','border','border-image','border-radius','box-shadow','filter','object-fit','object-position','font-family','font-size','font-weight','font-style','line-height','letter-spacing','white-space','word-break','overflow-wrap','text-align','text-transform','text-shadow','align-items','justify-content','flex-direction','flex-wrap','flex','gap','grid-template-columns','align-content','z-index','zoom'];
async function captureScene(root, logicalWidth, logicalHeight, signal) {
  const bounds = root.getBoundingClientRect(), ratio = devicePixelRatio || 1;
  const width = Math.max(2, Math.round(bounds.width * ratio)), height = Math.max(2, Math.round(bounds.height * ratio));
  const clone = root.cloneNode(true), originals = [root, ...root.querySelectorAll('*')], copies = [clone, ...clone.querySelectorAll('*')];
  const pending = [];
  // Copy immediately, before awaiting asset loads, to freeze this opening's state.
  originals.forEach((node, i) => {
    const copy = copies[i], css = getComputedStyle(node);
    copy.removeAttribute('id'); copy.removeAttribute('class');
    copy.style.cssText = '';
    for (const name of styles) {
      const value = css.getPropertyValue(name);
      if (value.includes('url(')) pending.push(inlineURLs(value).then(v => copy.style.setProperty(name, v)));
      else copy.style.setProperty(name, value);
    }
    if (node.tagName === 'IMG') {
      copy.removeAttribute('srcset'); copy.removeAttribute('loading');
      pending.push(dataURL(node.currentSrc || node.src).then(url => copy.setAttribute('src', url)));
    }
    if (node.scrollTop || node.scrollLeft) {
      const wrap = document.createElement('div'); wrap.style.transform = `translate(${-node.scrollLeft}px,${-node.scrollTop}px)`;
      wrap.style.position = 'relative'; wrap.style.width = node.scrollWidth + 'px'; wrap.style.height = node.scrollHeight + 'px';
      wrap.append(...copy.childNodes); copy.append(wrap);
    }
  });
  Object.assign(clone.style, {position:'relative',inset:'auto',left:'0px',top:'0px',transform:'none',width:logicalWidth+'px',height:logicalHeight+'px'});
  const fonts = await Promise.all([['GloryNoto','game-noto'],['GloryBender','game-bender'],['GloryBenderLight','game-bender-light']].map(async ([family,file]) => `@font-face{font-family:${family};src:url("${await dataURL('/medals/native/'+file+'.woff2')}")}`));
  await Promise.all(pending); signal.throwIfAborted();
  const xml = new XMLSerializer().serializeToString(clone);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${logicalWidth} ${logicalHeight}"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml"><style>${fonts.join('')}</style>${xml}</div></foreignObject></svg>`;
  const image = new Image(); image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  await image.decode(); signal.throwIfAborted();
  const surface = document.createElement('canvas'); surface.width=width;surface.height=height;
  const context = surface.getContext('2d'); context.drawImage(image,0,0);
  return {width,height,pixels:context.getImageData(0,0,width,height).data};
}
function filterInWorker(capture, signal) {
  return new Promise((resolve,reject) => {
    signal.throwIfAborted();
    const worker = new Worker(new URL('./native-blur-worker.mjs', import.meta.url), {type:'module'});
    const stop = () => {worker.terminate();signal.removeEventListener('abort',abort);};
    const abort = () => {stop();reject(signal.reason);};
    signal.addEventListener('abort',abort,{once:true});
    worker.onmessage = ({data}) => {stop();data.error?reject(Error(data.error)):resolve(data);};
    worker.onerror = () => {stop();reject(Error('Native blur worker failed'));};
    worker.postMessage(capture,[capture.pixels.buffer]);
  });
}
export async function renderNativeBlur(root, output, logicalWidth, logicalHeight, signal) {
  const capture = await captureScene(root,logicalWidth,logicalHeight,signal);
  const result = await filterInWorker(capture,signal); signal.throwIfAborted();
  output.width=result.width;output.height=result.height;
  output.getContext('2d').putImageData(new ImageData(result.pixels,result.width,result.height),0,0);
  output.dataset.blurSize=result.blurSize;output.dataset.blurIterations=result.iterations;
  output.dataset.blurState='ready';
}
