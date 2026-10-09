import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {calculateGrowth,calculatePlans,ownedAmount,recipeCapacity,craftingPlan,materialRequirements} from '../assets/js/growth-costs.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL('../data/'+p,import.meta.url)));
const operators=read('operators.json').operators,data=read('growth.json'),op=operators.find(o=>o.id==='char_377_gdglow');
const base={owned:true,elite:0,level:1,skill:1,potential:1,m:[0,0,0],mods:{}};
test('same state and untargeted operators never charge; potential upgrades cost specific tokens',()=>{
 assert.deepEqual(calculateGrowth(op,base,base,data).totals,{});
 assert.deepEqual(calculatePlans(operators,{[op.id]:base},{},data).totals,{});
 assert.deepEqual(calculateGrowth(op,base,{...base,potential:6},data).totals,{p_char_377_gdglow:5});
 assert.deepEqual(calculateGrowth(op,{...base,potential:3},{...base,potential:6},data).totals,{p_char_377_gdglow:3});
 assert.deepEqual(calculateGrowth(op,{...base,owned:false,potential:6},{...base,potential:6},data).totals,{p_char_377_gdglow:5});
});
test('general token substitution uses actual eligibility, class, rarity and the four-token rate',()=>{
 for(const [rarity,label] of [[4,'레어'],[5,'에픽'],[6,'로열']]){
  const c=operators.find(o=>o.rarity===rarity&&o.profession==='CASTER'&&data.potentials[o.id]?.alternatives.length),token=data.potentials[c.id];
  assert.equal(token.alternatives[0].count,4);assert.equal(token.alternatives[0].id,`tier${rarity}_caster`);
  assert.match(data.tokenItems[token.alternatives[0].id].name,new RegExp(label));
 }
 assert.deepEqual(data.potentials.char_002_amiya.alternatives,[],'Amiya cannot use general tokens');
 const vigil=operators.find(o=>o.id==='char_427_vigil');
 assert.equal(calculateGrowth(vigil,{...base,owned:false},{...base,potential:6},data).totals.voucher_vigil,6,'Activity voucher includes first acquisition');
 assert.equal(calculateGrowth(vigil,base,{...base,potential:6},data).totals.voucher_vigil,5);
 for(const c of operators){const token=data.potentials[c.id];if(!token)continue;assert.ok(data.tokenItems[token.id].iconId);for(const a of token.alternatives)assert.ok(data.tokenItems[a.id].iconId)}
 assert.equal(ownedAmount('p_char_377_gdglow',{items:{p_char_377_gdglow:2}},data),2);
});
test('level costs include each transition once and promotion resets to level one',()=>{
 assert.deepEqual(calculateGrowth(op,base,{...base,level:2},data).totals,{exp:100,'4001':30});
 const r=calculateGrowth(op,{...base,level:50},{...base,elite:1,level:2},data);
 assert.equal(r.totals.exp,120);assert.equal(r.totals['4001'],30048);
 assert.deepEqual(r.steps.map(s=>s.label),['E1 정예화','E1 Lv.1 → 2']);
});
test('unowned stale values are ignored and full E0 to E2 preparation is charged',()=>{
 const r=calculateGrowth(op,{...base,owned:false,elite:2,level:90},{...base,elite:2,level:1},data);
 assert.equal(r.totals.exp,24400+337000);assert.equal(r.totals['4001'],26719+353122+30000+180000);
 assert.match(r.notes.join(''),/미보유/);
});
test('only remaining common skill, mastery and actual module stages are charged',()=>{
 const m=op.modules[0],now={...base,elite:2,level:60,skill:7,m:[1,0,0],mods:{[m.id]:1}},goal={...now,m:[3,0,0],mods:{[m.id]:3}};
 const r=calculateGrowth(op,now,goal,data),expected={};
 for(const row of [...op.skills[0].mastery.slice(1),...m.costs.slice(1)])for(const x of row.cost)expected[x.id]=(expected[x.id]||0)+x.count;
 assert.deepEqual(r.totals,expected);assert.equal(r.steps.length,4);
 const skill=calculateGrowth(op,{...base,elite:1,skill:5},{...base,elite:1,skill:7},data);
 assert.equal(skill.steps.length,2);
 assert.deepEqual(calculateGrowth(op,goal,now,data).totals,{},'Stale goals never charge completed work');
});
test('all operators respect rarity limits, have consistent cost references and can be aggregated',()=>{
 for(const o of operators){const current={...base,owned:false},goal={...base,elite:o.phases.length-1,level:o.phases.at(-1).maxLevel,skill:o.skills.length?7:1};const r=calculateGrowth(o,current,goal,data);for(const id of Object.keys(r.totals))assert.ok(id==='exp'||data.items[id]||data.tokenItems[id],id)}
 const second=operators.find(o=>o.id==='char_124_kroos'),all=calculatePlans([op,second],{}, {[op.id]:{...base,level:2},[second.id]:{...base,level:2}},data);
 assert.equal(all.totals.exp,200);assert.equal(all.totals['4001'],60);
});
test('craft capacity reserves direct needs, includes LMD and output count, and inventory EXP combines records',()=>{
 const r=data.recipes['30013'][0],inventory={items:{30012:12,4001:1000,2001:3,2004:2}};
 assert.equal(recipeCapacity(r,inventory,{30012:2,4001:600},data),2);
 assert.equal(recipeCapacity(r,inventory,{4001:900},data),0);
 assert.equal(ownedAmount('exp',inventory,data),4600);
 assert.equal(recipeCapacity({...r,count:2},inventory,{},data),4);
 assert.ok(data.items['32001']);assert.ok(data.recipes['3233'].some(r=>r.room==='MANUFACTURE'));
 for(const list of Object.values(data.recipes))for(const r of list){assert.ok(data.items[r.itemId]);for(const x of r.cost)assert.ok(data.items[x.id]);assert.ok(r.requirements.length)}
});

test('multi-stage crafting uses low-tier stock, reserves growth costs and includes every LMD fee',()=>{
 const recipe=data.recipes['30013'][0],inventory={items:{30011:30,4001:1400}},before=JSON.stringify(inventory);
 const p=craftingPlan(recipe,2,inventory,{30013:2},data);
 assert.equal(p.possible,true);assert.deepEqual(p.used,{'30011':30,'4001':1400});
 assert.deepEqual(p.steps.map(s=>[s.recipe.itemId,s.runs,s.output]),[['30012',10,10],['30013',2,2]]);
 assert.deepEqual(p.missing,{});assert.equal(JSON.stringify(inventory),before);
 const reserved=craftingPlan(recipe,2,inventory,{30011:3,4001:100,30013:2},data);
 assert.equal(reserved.possible,false);assert.deepEqual(reserved.missing,{'30011':3,'4001':100});
 const mixed=craftingPlan(recipe,2,{items:{30012:3,30011:21,4001:1100}},{},data);
 assert.equal(mixed.possible,true);assert.equal(mixed.steps[0].runs,7);
});
test('crafting shares ingredients between branches and keeps batch leftovers',()=>{
 const r=(itemId,count,cost)=>({itemId,count,cost,goldCost:0});
 const fixture={expItems:{},recipes:{A:[r('A',2,[{id:'raw',count:3}])],B:[r('B',1,[{id:'A',count:1}])]}};
 const root=r('T',1,[{id:'B',count:1},{id:'A',count:1}]);
 const p=craftingPlan(root,1,{items:{raw:3}},{},fixture);
 assert.equal(p.possible,true);assert.deepEqual(p.used,{raw:3});assert.equal(p.steps.filter(s=>s.recipe.itemId==='A').length,1);
 const shared={expItems:{},recipes:{A:[r('A',1,[{id:'raw',count:2}])],B:[r('B',1,[{id:'raw',count:2}])]}};
 assert.deepEqual(craftingPlan(r('T',1,[{id:'A',count:1},{id:'B',count:1}]),1,{items:{raw:3}},{},shared).missing,{raw:1});
});
test('chip conversion stops cycles and supports manufacture output and rounding',()=>{
 const r=data.recipes['3233'][0];
 const p=craftingPlan(r,1,{items:{3262:3,32001:1}},{},data);
 assert.equal(p.possible,true);assert.deepEqual(p.steps.map(s=>s.recipe.itemId),['3232','3233']);
 const blocked=craftingPlan(r,1,{items:{32001:1}},{},data);
 assert.equal(blocked.possible,false);assert.ok(Object.keys(blocked.missing).length);
 const odd=craftingPlan(data.recipes['3232'][0],3,{items:{3262:6}},{},data);
 assert.equal(odd.possible,true);assert.equal(odd.steps.at(-1).output,4);
});
test('material tree expands only shortages and allocates shared stock once across roots',()=>{
 const r=(itemId,cost,count=1)=>({itemId,count,cost:cost.map(([id,count])=>({id,count})),goldCost:0,requirements:[],stages:[]});
 const model={recipes:{A:[r('A',[['C',2]])],B:[r('B',[['C',2]])],C:[r('C',[['D',3]])]},expItems:{}};
 const inventory={items:{A:2,C:3,D:6}},before=JSON.stringify(inventory);
 const report=materialRequirements({A:4,B:1,C:1},inventory,model);
 assert.equal(report.roots[0].short,2);assert.equal(report.roots[0].children[0].count,4);
 const rows=Object.fromEntries(report.rows.map(x=>[x.id,x]));
 assert.deepEqual(rows.C,{id:'C',count:7,owned:3});assert.deepEqual(rows.D,{id:'D',count:12,owned:6});
 assert.equal(JSON.stringify(inventory),before);
 assert.equal(materialRequirements({A:2},inventory,model).roots[0].children.length,0);
});
test('material tree handles batch leftovers, gold fees, EXP and cyclic recipes',()=>{
 const r=(itemId,cost,count=1,goldCost=0)=>({itemId,count,cost:cost.map(([id,count])=>({id,count})),goldCost});
 const model={recipes:{A:[r('A',[['C',1]])],B:[r('B',[['C',1]])],C:[r('C',[['D',1]],2,10)],X:[r('X',[['Y',1]])],Y:[r('Y',[['X',1]])]},expItems:{'2001':200}};
 const report=materialRequirements({A:1,B:1,exp:300},{items:{D:1,'4001':10,'2001':2}},model),rows=Object.fromEntries(report.rows.map(x=>[x.id,x]));
 assert.equal(rows.D.count,1);assert.equal(rows['4001'].count,10);assert.equal(rows.exp.owned,300);assert.equal(report.roots[2].displayOwned,400);
 assert.equal(materialRequirements({X:1},{items:{}},model).roots[0].children[0].children[0].children.length,0);
});
