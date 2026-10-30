import {cp,readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
export async function buildWardrobe(out){
 const source=path.join(root,'workers/admin/public/wardrobe'),dest=path.join(out,'wardrobe');
 await mkdir(dest,{recursive:true});
 for(const file of ['catalog.json','sd-models.json','illust-models.json','native-scene.json.gz','acquisition-routes.json','roster-metadata.json','btn-back.png'])await cp(path.join(source,file),path.join(dest,file));
 for(const file of ['ui.js','collection-cost.mjs','sd.js','illust.js','illust-timing.mjs','illust-effects.mjs','illust-effects-canvas.mjs','illust-model-map.mjs','original-layout.js','style.css']){
  let text=await readFile(path.join(source,file),'utf8');
  text=text.replaceAll('/preview/data/','./data/').replaceAll('/preview/assets/','./assets/').replaceAll('/wardrobe/',file==='style.css'?'':'./wardrobe/');
  if(file==='style.css')text=text.replaceAll("url('./assets/","url('../assets/");
  if(file==='ui.js')text=text.replaceAll("import('./assets/","import('../assets/").replace("const root=demo?'https://moonwhale-ko.github.io/-Arknights-Tool/':'/preview/';","const root='./';");
  await writeFile(path.join(dest,file),text);
 }
 await cp(path.join(source,'effects'),path.join(dest,'effects'),{recursive:true});
 let html=await readFile(path.join(source,'preview.html'),'utf8');
 html=html.replaceAll('/preview/assets/','assets/').replaceAll('/wardrobe/','wardrobe/').replace('</head>','<link rel="stylesheet" href="assets/css/guide-tour.css?v=1"><script type="module" src="assets/js/guide-tour.mjs?v=8"></script></head>');
 await writeFile(path.join(out,'wardrobe.html'),html);
}
