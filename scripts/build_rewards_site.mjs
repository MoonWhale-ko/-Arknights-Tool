// Build the public reward page from the same reviewed source as the private preview.
import {buildWardrobe} from './build_wardrobe_site.mjs';
import {cp,readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url)),source=path.join(root,'workers/admin/public');
export async function buildRewards(destination){
 const out=path.resolve(destination);
 await buildWardrobe(out);
 for(const dir of ['assets/js/rewards/mining','assets/js/rewards/orundum','assets/css','data/rewards'])await mkdir(path.join(out,dir),{recursive:true});
 for(const file of ['engine.mjs','evidence.mjs','story-labels.mjs'])await cp(path.join(source,'mining',file),path.join(out,'assets/js/rewards/mining',file));
 for(const file of ['engine.mjs','additional.mjs'])await cp(path.join(source,'orundum',file),path.join(out,'assets/js/rewards/orundum',file));
 for(const kind of ['mining','orundum'])await cp(path.join(source,kind,'catalog.json'),path.join(out,'data/rewards',kind+'.json'));
 let ui=await readFile(path.join(source,'preview-rewards.js'),'utf8');
 ui=ui.replaceAll("from '/mining/","from './rewards/mining/").replaceAll("from '/orundum/","from './rewards/orundum/").replaceAll("from './assets/js/","from './").replaceAll("'/mining/catalog.json'","'data/rewards/mining.json'").replaceAll("'/orundum/catalog.json'","'data/rewards/orundum.json'");
 await writeFile(path.join(out,'assets/js/rewards.mjs'),ui);
 await cp(path.join(source,'preview-rewards.css'),path.join(out,'assets/css/rewards.css'));
 const html=await readFile(path.join(root,'rewards.html'),'utf8');
 await writeFile(path.join(out,'rewards.html'),html);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(!process.argv[2])throw Error('Provide the public output directory.');
 await buildRewards(process.argv[2]);console.log('Built public reward page and its required assets.');
}
