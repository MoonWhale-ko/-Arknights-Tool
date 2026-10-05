const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'operators.html'),'utf8');
const data=JSON.parse(fs.readFileSync(path.join(root,'data/operators.json'))),classification=JSON.parse(fs.readFileSync(path.join(root,'data/professions.json')));
const progress={char_103_angel:{owned:true,elite:2,level:90,potential:6,trust:200,skill:7,m:[1,2,3],mods:{},custom:'preserve'}};
const storage=new Map([['arknightsOperatorProgressV1',JSON.stringify(progress)],['arknightsPngSettingsV1',JSON.stringify({columns:8,fields:{trust:false}})]]),writes=[];
const elements=new Map();function element(){return {value:'',checked:true,innerHTML:'',classList:{toggle(){}},style:{removeProperty(){},setProperty(){}},addEventListener(){},querySelectorAll(){return[]},querySelector(){return null},clientWidth:1000,showModal(){this.open=true},close(){this.open=false}}}
const document={getElementById(id){if(!elements.has(id))elements.set(id,element());return elements.get(id)},querySelectorAll(){return[]},querySelector(){return null},fonts:{ready:Promise.resolve()}};
const ctx=vm.createContext({document,window:{addEventListener(){}},console,setTimeout,clearTimeout,localStorage:{getItem(k){return storage.get(k)||null},setItem(k,v){writes.push(k);storage.set(k,v)}},fetch:url=>Promise.resolve({json:()=>Promise.resolve(url==='data/professions.json'?classification:data)})});
vm.runInContext(html.split('<script>')[1].split('</script>')[0],ctx);vm.runInContext(fs.readFileSync(path.join(root,'assets/js/operator-png.js'),'utf8'),ctx);
const run=s=>vm.runInContext(s,ctx),json=s=>JSON.parse(run(`JSON.stringify(${s})`));
(async()=>{await new Promise(r=>setImmediate(r));
 assert.equal(run('pngSettings.columns'),8);assert.equal(run('pngSettings.fields.trust'),false);
 assert.equal(json('normalizePngSettings({columns:999})').columns,6);assert.equal(json('normalizePngSettings(null)').target,'all');
 assert.deepEqual(json('pngOperators(normalizePngSettings()).map(c=>c.id)'),['char_103_angel']);
 run("selectedProfession='PIONEER'");assert.equal(run("pngOperators(normalizePngSettings({target:'filtered'})).length"),0);assert.equal(run('pngOperators(normalizePngSettings()).length'),1);
 run("selectedProfession='';selectedBranch=''");
 const card=run('pngCard(chars.find(c=>c.id==="char_103_angel"),normalizePngSettings())');assert.match(card,/Lv\.90/);assert.match(card,/potential-p6\.svg/);assert.match(card,/mastery-m3\.svg/);assert.ok(!card.includes('<input'));
 const plain=run("pngCard(chars.find(c=>c.id==='char_103_angel'),normalizePngSettings({fields:Object.fromEntries(Object.keys(PNG_FIELDS).map(k=>[k,false]))}))");assert.ok(!plain.includes('png-progress'));assert.ok(!plain.includes('Lv.90'));assert.ok(plain.includes('엑시아'));
 document.getElementById('exportPng').onclick();assert.equal(elements.get('pngDialog').open,true);assert.match(elements.get('pngPreviewStage').innerHTML,/엑시아/);assert.ok(!elements.get('pngPreviewStage').innerHTML.includes('가비알'));
 assert.deepEqual(JSON.parse(storage.get('arknightsOperatorProgressV1')),progress);assert.ok(writes.every(k=>k==='arknightsPngSettingsV1'));
 run('state={};chars.forEach(c=>get(c.id).owned=true)');
 for(const columns of [4,6,8])for(const group of ['profession','rarity'])for(const split of ['single','profession']){
  const pages=json(`pngPages(chars,normalizePngSettings({columns:${columns},group:'${group}',split:'${split}'}))`),ids=pages.flatMap(p=>p.sections.flatMap(s=>s.operators.map(c=>c.id)));
  assert.equal(ids.length,410);assert.equal(new Set(ids).size,410);
  for(const p of pages){const estimate=120+p.sections.reduce((sum,s)=>sum+52+Math.ceil(s.operators.length/columns)*348,0);assert.ok(estimate<=Math.min(8000,Math.floor(15000000/p.width)));if(split==='profession')assert.ok(p.sections.every(s=>s.operators.every(c=>c.profession===p.id)))}
 }
 assert.deepEqual(json('pngPages([],normalizePngSettings())'),[]);
 console.log('PNG checks passed: owned-only output, filter intersection, stored settings, field toggles, preview, unchanged progress, all 12 layouts, lossless bounded pagination.');
})().catch(e=>{console.error(e);process.exitCode=1});
