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
const admin=await readFile(publicDir+'index.html','utf8');
const sections=['mining','orundum'].map(id=>admin.match(new RegExp('<section id="'+id+'"[\\s\\S]*?</section>'))[0].replace(' hidden',''));
const html=`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>보상 확인 · Z.O.O.T.</title><link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="assets/css/zoot.css"><link rel="stylesheet" href="rewards.css"><script src="assets/js/zoot.js"></script><script type="module" src="/mining/ui.js"></script><script type="module" src="/orundum/ui.js"></script><script type="module" src="rewards.js"></script></head><body class="zoot-page"><main class="reward-wrap"><p class="eyebrow">ACCOUNT REWARDS</p><h1>남은 보상</h1><p>계정에 남아 있는 순오리지늄과 합성옥을 확인하세요.</p><nav class="reward-tabs" aria-label="보상 종류"><button data-reward="mining" aria-pressed="true">순오리지늄</button><button data-reward="orundum" aria-pressed="false">합성옥</button></nav>${sections.join('')}</main></body></html>`;
await writeFile(out+'rewards.html',html);
await cp(publicDir+'preview-rewards.js',out+'rewards.js');await cp(publicDir+'preview-rewards.css',out+'rewards.css');
console.log('Private preview built from the same public site sources.');
