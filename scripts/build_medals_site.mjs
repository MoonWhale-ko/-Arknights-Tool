import {cp,readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
export async function buildMedals(out){
 const source=path.join(root,'workers/admin/public/medals'),dest=path.join(out,'medals');
 await mkdir(dest,{recursive:true});
 for(const file of ['style.css','model.mjs','medal-scroll.mjs','medal-backing.mjs','catalog.json','native-layout.json','native-backgrounds.json'])await cp(path.join(source,file),path.join(dest,file));
 await cp(path.join(source,'native/sets'),path.join(dest,'native/sets'),{recursive:true});
 let ui=await readFile(path.join(source,'ui.js'),'utf8');
 ui=ui.replaceAll("'/medals/","'medals/").replace(/if\(new URLSearchParams\(location.search\).get\('demo'\)==='complete'\)\{records=Object.fromEntries\(catalog.medals.map\(m=>\[m.id,\{fts:1793289600,val:\[\]\}\]\)\);\}/,'');
 await writeFile(path.join(dest,'ui.js'),ui);
 let html=await readFile(path.join(source,'preview.html'),'utf8');
 html=html.replaceAll('/preview/assets/','assets/').replaceAll('/medals/','medals/').replace('zoot.css?v=15','zoot.css?v=18').replace('zoot.js?v=10','zoot.js?v=12');
 await writeFile(path.join(out,'medals.html'),html);
}
