import {cp,readFile,writeFile,mkdir,rm,readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const publicDir=fileURLToPath(new URL('../public/',import.meta.url)),out=publicDir+'preview/';
await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});
for(const entry of await readdir(root))if(entry.endsWith('.html'))await cp(root+entry,out+entry);
for(const dir of ['assets','data','research'])await cp(root+dir,out+dir,{recursive:true});
// Proposed navigation is private until the rewards page is published.
const home=await readFile(out+'index.html','utf8');
let proposedHome=home.replace('</nav>','<div class="home-card-shadow"><a class="home-card" href="rewards.html"><span class="icon" aria-hidden="true" style="display:grid;place-items:center"><span style="display:block;width:100%;height:86.021505%;background-image:url(https://raw.githubusercontent.com/mashirozx/arknights-ui/master/img/UI_HOME.png);background-size:auto 2000%;background-position:72.984441% 23.684211%;background-repeat:no-repeat"></span></span><h2>광산</h2></a></div></nav>');
const navigation=proposedHome.match(/<nav class="grid"[^>]*>[\s\S]*?<\/nav>/)[0];
const cards=[...navigation.matchAll(/<div class="home-card-shadow">[\s\S]*?<\/div>/g)].map(m=>m[0]);
const order=['recruitment.html','operators.html','base.html','rewards.html','backpack.html'];
const ordered=order.map((href,index)=>{
  const card=cards.find(card=>card.includes('href="'+href+'"'));
  if(!card)throw new Error('Missing home feature: '+href);
  return card.replace('class="home-card-shadow"','class="home-card-shadow" data-feature-number="'+(index+1)+'"');
});
proposedHome=proposedHome.replace(navigation,'<nav class="grid" aria-label="기능 선택">'+ordered.join('')+'</nav>')
  .replace('</head>','<link rel="stylesheet" href="home-preview.css"></head>');
await writeFile(out+'index.html',proposedHome);
await cp(publicDir+'preview-home.css',out+'home-preview.css');
await cp(publicDir+'preview-rewards.html',out+'rewards.html');
await cp(publicDir+'preview-rewards.js',out+'rewards.js');
await cp(publicDir+'preview-rewards.css',out+'rewards.css');
console.log('Private preview built from the same public site sources.');
