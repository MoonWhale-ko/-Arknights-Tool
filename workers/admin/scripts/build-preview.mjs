import {cp,mkdir,rm,readdir,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {buildRewards} from '../../../scripts/build_rewards_site.mjs';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const out=fileURLToPath(new URL('../public/preview/',import.meta.url));
await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});
for(const entry of await readdir(root))if(entry.endsWith('.html'))await cp(root+entry,out+entry);
for(const dir of ['assets','data','research'])await cp(root+dir,out+dir,{recursive:true});
await buildRewards(out);
await cp(new URL('../public/wardrobe/preview.html',import.meta.url),out+'wardrobe.html');
await cp(new URL('../public/medals/preview.html',import.meta.url),out+'medals.html');
console.log('Private preview uses the exact public site sources and reward build.');

// Medal work remains in the authenticated preview until public release.
let home=await readFile(out+'index.html','utf8');
const medalCard='<div class="home-card-shadow" data-feature-number="5"><a class="home-card" href="medals.html"><img class="icon medal-home-icon" src="assets/icons/Medal_icon.svg" width="70" height="70" alt="" aria-hidden="true"><h2>훈장</h2></a></div>';
home=home.replace(/<div class="home-card-shadow"[^>]*><a class="home-card" href="rewards.html">/,match=>medalCard+match);
let featureNumber=0;home=home.replace(/data-feature-number="\d+"/g,()=>`data-feature-number="${++featureNumber}"`);
home=home.replace('zoot.js?v=9','zoot.js?v=11').replace('home-guide.js?v=8','home-guide.js?v=9');
await writeFile(out+'index.html',home);
