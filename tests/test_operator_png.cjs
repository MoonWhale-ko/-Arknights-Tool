const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'operators.html'),'utf8');
const data=JSON.parse(fs.readFileSync(path.join(root,'data/operators.json'))),classification=JSON.parse(fs.readFileSync(path.join(root,'data/professions.json')));
const progress={char_103_angel:{owned:true,elite:2,level:90,potential:6,trust:200,skill:7,m:[1,2,3],mods:{},custom:'preserve'}};
const storage=new Map([['arknightsOperatorProgressV1',JSON.stringify(progress)],['arknightsPngSettingsV1',JSON.stringify({columns:8,fields:{trust:false}})]]),writes=[];
const elements=new Map();function element(){return {value:'',checked:true,innerHTML:'',classList:{toggle(){}},style:{removeProperty(){},setProperty(){}},setAttribute(k,v){this[k]=v},addEventListener(){},querySelectorAll(){return[]},querySelector(){return null},clientWidth:1000,showModal(){this.open=true},close(){this.open=false}}}
const document={getElementById(id){if(!elements.has(id))elements.set(id,element());return elements.get(id)},querySelectorAll(){return[]},querySelector(){return null},fonts:{ready:Promise.resolve()}};
const ctx=vm.createContext({document,window:{addEventListener(){}},console,setTimeout,clearTimeout,localStorage:{getItem(k){return storage.get(k)||null},setItem(k,v){writes.push(k);storage.set(k,v)}},fetch:url=>Promise.resolve({json:()=>Promise.resolve(url==='data/operator-aliases.json'?JSON.parse(fs.readFileSync(path.join(root,'data/operator-aliases.json'),'utf8')):url==='data/professions.json'?classification:data)})});
vm.runInContext(html.split('<script>')[1].split('</script>')[0],ctx);vm.runInContext(fs.readFileSync(path.join(root,'assets/js/operator-png.js'),'utf8'),ctx);
const run=s=>vm.runInContext(s,ctx),json=s=>JSON.parse(run(`JSON.stringify(${s})`));
(async()=>{await new Promise(r=>setImmediate(r));
 if(run('chars.some(c=>c.isFuture)'))assert.match(run('pngCard(chars.find(c=>c.isFuture),normalizePngSettings())'),/>미래시<\/span>/);
 // Canvas needs an explicit SVG viewport, rather than the browser's default
 // 300x150 intrinsic dimensions, for every stage of every progress icon.
 for(const file of fs.readdirSync(path.join(root,'assets/icons/progress')).filter(f=>f.endsWith('.svg'))){
  const svg=fs.readFileSync(path.join(root,'assets/icons/progress',file),'utf8').match(/<svg\b[^>]*>/)[0];
  const view=svg.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number);
  assert.equal(Number(svg.match(/\bwidth="([^"]+)"/)?.[1]),view[2],file+' intrinsic width');
  assert.equal(Number(svg.match(/\bheight="([^"]+)"/)?.[1]),view[3],file+' intrinsic height');
 }
 // Attached, dimensionless SVGs have a CSS viewport that differs from their
 // intrinsic size. Rasterization must draw a separately decoded source.
 const drawCalls=[];let decoded=0;
 ctx.Image=class {constructor(){this.naturalWidth=300;this.naturalHeight=272}async decode(){decoded++}};
 document.createElement=()=>({getContext:()=>({drawImage(...args){drawCalls.push(args)}}),toDataURL:()=> 'data:image/png;base64,test'});
 const attached={naturalWidth:300,naturalHeight:272,currentSrc:'https://example.test/mastery-m3.svg',crossOrigin:null,classList:{contains:()=>true},style:{},getBoundingClientRect:()=>({width:42,height:42}),decode:async()=>{}};
 ctx.bakeRoot={querySelectorAll:()=>[attached]};
 await run('bakePngImages(bakeRoot)');
 assert.equal(decoded,1);assert.notEqual(drawCalls[0][0],attached,'Do not draw the CSS-sized SVG as an intrinsic-size source');
 assert.equal(drawCalls[0][0].src,attached.currentSrc);assert.ok(Math.abs(drawCalls[0][7]-42)<1e-10);assert.equal(attached.style.objectFit,'fill');
 const portrait=json("pngImagePlacement(512,512,100,334,'cover')");
 assert.equal(portrait[3],512);assert.ok(Math.abs(portrait[2]/portrait[3]-100/334)<1e-12);
 assert.equal(portrait[1],0);assert.ok(portrait[0]>0);
 const landscape=json("pngImagePlacement(100,300,200,100,'cover')");assert.equal(landscape[2],100);assert.ok(landscape[1]>0);
 const icon=json("pngImagePlacement(256,233,42,42,'contain')");assert.equal(icon[6],42);assert.ok(icon[5]>0);assert.ok(Math.abs(icon[6]/icon[7]-256/233)<1e-12);
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
 for(const columns of [4,6,8])for(const split of ['single','profession']){
  const pages=json(`pngPages(chars,normalizePngSettings({columns:${columns},split:'${split}'}))`),ids=pages.flatMap(p=>p.sections.flatMap(s=>s.operators.map(c=>c.id)));
  assert.equal(pages.length,1,'Always one image, including legacy profession split settings');assert.equal(ids.length,data.operators.length);assert.equal(new Set(ids).size,data.operators.length);
  for(const p of pages){const estimate=120+p.sections.reduce((sum,s)=>sum+52+Math.ceil(s.operators.length/columns)*348,0),scale=run(`pngCaptureScale(${p.width},${estimate})`);assert.ok(p.width*scale<=16384);assert.ok(estimate*scale<=16384);assert.ok(p.width*estimate*scale*scale<=15000001);assert.ok(p.sections.every(s=>s.operators.every(c=>c.profession===s.profession&&c.rarity===s.rarity)),'Each row group has one rarity and profession')}
 }
 const order=json("pngSections([{id:'a',rarity:5,profession:'PIONEER',name:'가'},{id:'b',rarity:6,profession:'WARRIOR',name:'가'},{id:'c',rarity:6,profession:'PIONEER',name:'나'},{id:'d',rarity:6,profession:'PIONEER',name:'가'}]).flatMap(s=>s.operators.map(c=>c.id))");
 assert.deepEqual(order,['d','c','a','b']);
 assert.deepEqual(json("[{id:'a',rarity:5,profession:'PIONEER',name:'가'},{id:'b',rarity:6,profession:'WARRIOR',name:'가'},{id:'c',rarity:6,profession:'PIONEER',name:'나'},{id:'d',rarity:6,profession:'PIONEER',name:'가'}].sort(pngSort).map(c=>c.id)"),order);
 const grouped=json('pngSections(chars)');assert.ok(grouped.every(s=>s.operators.every(c=>c.profession===s.profession&&c.rarity===s.rarity)));
 const sheet=run('pngSheet(pngPages(chars,normalizePngSettings())[0],normalizePngSettings(),chars.length,0,1)');assert.match(sheet,/png-group-rarity/);assert.match(sheet,/class-glyph/);assert.match(sheet,/뱅가드/);
 assert.ok(!('group' in json("normalizePngSettings({group:'profession'})")),'Legacy grouping setting cannot change ordering');
 assert.ok(!html.includes('id="png-group"'));assert.ok(!html.includes('id="png-split"'));assert.equal(run('pngCaptureScale(1000,1000)'),1);assert.ok(run('pngCaptureScale(2000,100000)')<1);
 assert.deepEqual(json('pngPages([],normalizePngSettings())'),[]);
 console.log('PNG checks passed: owned-only output, filter intersection, stored settings, field toggles, preview, unchanged progress, fixed profession/rarity/name order, all 6 layouts, single-image output with proportional canvas sizing.');
})().catch(e=>{console.error(e);process.exitCode=1});
