const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'operators.html'),'utf8');
const source=html.split('<script>')[1].split('</script>')[0];
const data=JSON.parse(fs.readFileSync(path.join(root,'data/operators.json'),'utf8'));
const original={char_103_angel:{owned:true,elite:2,level:90,potential:4,trust:200,skill:7,m:[1,2,3],mods:{X:2,Y:1,D:0},custom:'keep'}};
let saved=JSON.stringify(original),writes=0;
const elements=new Map();
function element(){return{value:'',innerHTML:'',classList:{toggle(){}},style:{removeProperty(){},setProperty(){}},setAttribute(k,v){this[k]=v},addEventListener(){},querySelectorAll(){return[]}}}
const document={getElementById(id){if(!elements.has(id))elements.set(id,element());return elements.get(id)},querySelectorAll(){return[]},querySelector(){return null},fonts:{ready:Promise.resolve()}};
const ctx=vm.createContext({document,window:{addEventListener(){}},console,localStorage:{getItem(){return saved},setItem(k,v){assert.equal(k,'arknightsOperatorProgressV1');saved=v;writes++}},fetch:url=>Promise.resolve({json:()=>Promise.resolve(url==='data/operator-aliases.json'?JSON.parse(fs.readFileSync(path.join(root,'data/operator-aliases.json'),'utf8')):url==='data/professions.json'?JSON.parse(fs.readFileSync(path.join(root,'data/professions.json'),'utf8')):data)})});
vm.runInContext(fs.readFileSync(path.join(root,'assets/js/operator-shared.js'),'utf8'),ctx);
vm.runInContext(source,ctx);
const run=s=>vm.runInContext(s,ctx),json=s=>JSON.parse(run(`JSON.stringify(${s})`));
(async()=>{
 await new Promise(r=>setImmediate(r));
 const beforeFutureFilter=JSON.stringify(saved);
 elements.get('futureOnly').onclick();
 assert.equal(elements.get('futureOnly')['aria-pressed'],'true');
 assert.equal(run("chars.filter(c=>matchesOperator(c,'','','')).length"),data.operators.filter(c=>c.isFuture).length);
 assert.ok(json("chars.filter(c=>matchesOperator(c,'','6','')).map(c=>c.isFuture&&c.rarity===6)").every(Boolean));
 assert.equal(run("chars.filter(c=>matchesOperator(c,'엑시아','','')).length"),0);
 elements.get('futureOnly').onclick();
 assert.equal(elements.get('futureOnly')['aria-pressed'],'false');
 assert.equal(run("chars.filter(c=>matchesOperator(c,'','','')).length"),data.operators.length);
 assert.equal(JSON.stringify(saved),beforeFutureFilter,'Future filter preserves saved progress');
 for(const [alias,id] of [['핑댕이','char_377_gdglow'],['수첸','char_1013_chen2'],['특사스','char_1028_texas2'],['뱅재','char_1045_svash2'],['날시','char_1052_kalts2'],['핑냥이','char_377_gdglow'],['오고곡','char_4027_heyak'],['몬삼이','char_4179_monstr']]){
 const found=json(`chars.filter(c=>matchesOperator(c,${JSON.stringify(alias)},'','')).map(c=>c.id)`);assert.deepEqual(found,[id]);
 }
 assert.deepEqual(json("chars.filter(c=>matchesOperator(c,'은재','','')).map(c=>c.id).sort()"),['char_1045_svash2','char_172_svrash']);
 assert.equal(run("chars.filter(c=>matchesOperator(c,'골든글로우','','')).length"),1);
 assert.deepEqual(json("chars.filter(c=>matchesOperator(c,'힐미야','','')).map(c=>c.id)"),['char_1037_amiya3'],'Medic Amiya alias matches only the medic form');
 assert.equal(writes,0);assert.deepEqual(JSON.parse(saved),original,'Opening page must preserve saved progress');
 assert.equal(json('get("char_103_angel")').custom,'keep');
 assert.equal(run('chars.length'),data.operators.length);
 if(run('chars.some(c=>c.isFuture)')){
  const future=run('card(chars.find(c=>c.isFuture))');
  assert.match(future,/class="future-badge"/);assert.match(future,/>미래시<\/span>/);
 }
 assert.ok(!run('card(chars.find(c=>c.id==="char_103_angel"))').includes('future-badge'));
 assert.match(elements.get('professionTabs').innerHTML,/스페셜리스트/);
 assert.match(elements.get('grid').innerHTML,/rarity-group/);
 const grouped=run('groupedCards()');
 assert.equal((grouped.match(/class="rarity-group /g)||[]).length,6);
 assert.equal((grouped.match(/<article /g)||[]).length,data.operators.length);
 const beforeFilter=saved, beforeWrites=writes;
 run("selectedProfession='PIONEER';selectedBranch='charger'");
 const filtered=json("chars.filter(c=>matchesOperator(c,'','','')).map(c=>({profession:c.profession,branch:c.subProfessionId}))");
 assert.ok(filtered.length>0);assert.ok(filtered.every(c=>c.profession==='PIONEER'&&c.branch==='charger'));
 assert.equal(run("chars.filter(c=>matchesOperator(c,'백파이프','6','0')).length"),1);
 assert.equal(run("chars.filter(c=>matchesOperator(c,'엑시아','','')).length"),0);
 for(const profession of Object.keys(json('professionKo'))){
  run(`selectedProfession=${JSON.stringify(profession)};selectedBranch=''`);
  const branches=json(`branchesFor(${JSON.stringify(profession)})`);
  assert.ok(branches.length);assert.ok(branches.every(([id,name])=>name!==id));
  assert.ok(json("chars.filter(c=>matchesOperator(c,'','',''))").every(c=>c.profession===profession));
 }
 run("selectedProfession='';selectedBranch=''");
 assert.equal(saved,beforeFilter);assert.equal(writes,beforeWrites,'Filtering must not write to saved progress');
 run('selectedRarities=new Set([6,4]);syncRaritySelection()');
 assert.equal(elements.get('rarity').value,'6,4');
 assert.ok(json("chars.filter(c=>matchesOperator(c,'','6,4','')).map(c=>c.rarity)").every(r=>r===6||r===4));
 assert.equal(run("chars.filter(c=>matchesOperator(c,'','none','')).length"),0);
 run('toggleRarity(4)');assert.equal(elements.get('rarity').value,'6');
 run('selectedRarities=new Set([6,5,4,3,2,1]);syncRaritySelection()');assert.equal(elements.get('rarity').value,'');
 assert.equal(writes,beforeWrites);
 const angel=run('card(chars.find(c=>c.id==="char_103_angel"))');
 assert.match(angel,/name">엑시아/);assert.match(angel,/potential-p4.svg/);assert.match(angel,/mastery-m3.svg/);
 assert.match(angel,/<span class="rank">S3<\/span>/);assert.ok(!angel.includes('과부하 모드'));
 assert.match(angel,/Stage 2/);
 run('setVal("char_103_angel","mod:uniequip_002_angel",3)');
 assert.equal(json('get("char_103_angel")').mods.uniequip_002_angel,3,'Module IDs must not be parsed as mastery keys');
 assert.equal(json('get("char_103_angel")').mods.Y,1,'Other legacy module data preserved');
 run('setVal("char_103_angel","elite",0)');
 assert.equal(json('get("char_103_angel")').level,50);assert.equal(json('get("char_103_angel")').skill,4);
 assert.deepEqual(json('get("char_103_angel").m'),[0,0,0]);
 run('setVal("char_103_angel","level",999)');assert.equal(json('get("char_103_angel")').level,50);
 run('setVal("char_103_angel","trust",999)');assert.equal(json('get("char_103_angel")').trust,200);
 run('setVal("char_103_angel","elite",2);setVal("char_103_angel","skill",7);setVal("char_103_angel","m2",3)');
 assert.equal(json('get("char_103_angel")').m[2],3);
 const kroos=run('card(chars.find(c=>c.id==="char_124_kroos"))');assert.ok(!kroos.includes('class="section modules"'));assert.ok(!kroos.includes('S2'));
 const robot=run('card(chars.find(c=>c.id==="char_285_medic2"))');assert.ok(!robot.includes('스킬 레벨'));
 assert.equal(json('get("char_124_kroos")').level,1);assert.equal(json('get("char_124_kroos")').elite,0);
 assert.ok(!/\.(?:settings|card)[^{]*\{[^}]*overflow(?:-y)?:auto/.test(html));assert.ok(html.includes('height:auto;min-height:var(--card-height,402px)'));
 for(const name of ['elite-e0','elite-e1','elite-e2','potential-p1','potential-p2','potential-p3','potential-p4','potential-p5','potential-p6','mastery-m0','mastery-m1','mastery-m2','mastery-m3'])assert.ok(fs.existsSync(path.join(root,'assets/icons/progress',name+'.svg')));
 run('setVal("char_002_amiya","owned",true);setVal("char_002_amiya","elite",2);setVal("char_002_amiya","skill",7);setVal("char_002_amiya","m0",1);setVal("char_1001_amiya2","owned",true);setVal("char_1001_amiya2","level",80);setVal("char_1001_amiya2","potential",4);setVal("char_1001_amiya2","trust",150);setVal("char_1001_amiya2","m0",3)');
for(const id of ['char_002_amiya','char_1001_amiya2','char_1037_amiya3']){
 const value=json(`get("${id}")`);assert.equal(value.elite,2);assert.equal(value.level,80);assert.equal(value.skill,7);assert.equal(value.potential,4);assert.equal(value.trust,150);
}
assert.equal(json('get("char_002_amiya")').m[0],1);assert.equal(json('get("char_1001_amiya2")').m[0],3);assert.equal(json('get("char_1037_amiya3")').m[0],0);
assert.equal(json('get("char_1037_amiya3")').owned,false,'Separate form ownership must not imply story unlock');
run(`state={char_002_amiya:{...def(),owned:true,elite:2,level:80,skill:7,trust:123,m:[1,0,0],custom:'keep',classVariants:{char_1001_amiya2:{skills:chars.find(c=>c.id==='char_1001_amiya2').skills.map(s=>({id:s.id,mastery:2})),modules:{uniequip_002_amiya2:3}}}}};shared.migrate(chars,state,def)`);
assert.equal(json('get("char_1001_amiya2")').m[0],2);assert.equal(json('get("char_1001_amiya2")').mods.uniequip_002_amiya2,3);assert.equal(json('get("char_1001_amiya2")').trust,123);
assert.equal(json('get("char_002_amiya")').custom,'keep');assert.equal(json('get("char_002_amiya")').m[0],1);
assert.equal(run('shared.migrate(chars,state,def)'),false,'Migration is repeatable and preserves form-specific progress');
console.log('Operator checks passed: saved progress, legacy modules, real skills/modules, limits, defaults, no inner scrolling, SVG assets.');
})().catch(e=>{console.error(e);process.exitCode=1});
