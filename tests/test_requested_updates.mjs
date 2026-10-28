import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {normalizeOptions} from '../assets/js/base-optimizer.mjs';
import {createTerraModel} from '../assets/js/infra-v2-terra-model.mjs';
import {simulate} from '../assets/js/infra-v2-core.mjs';
import {moduleMissionDescription} from '../assets/js/module-mission-labels.mjs';
import {trainingGroundRewards} from '../workers/admin/public/orundum/training-ground.mjs';
const catalog=JSON.parse(fs.readFileSync(new URL('../data/base-optimizer.json',import.meta.url)));
test('24h rotations collect and rotate at 24, 48 and 72 hours even after morale depletion',()=>{
 assert.equal(normalizeOptions({rotation:'24h'}).rotation,'24h');
 for(const teams of [2,3]){const model=createTerraModel(catalog,{base:{rooms:{office:{type:'HIRE',level:1}}},progress:{char_278_orchid:{owned:true,elite:0,level:1},char_503_rang:{owned:true,elite:0,level:1},char_183_skgoat:{owned:true,elite:0,level:1}},options:{teams,rotation:'24h',maxHours:72,optimizeDormSupport:false}});const ids=['char_278_orchid','char_503_rang','char_183_skgoat'];const plan={groups:Array.from({length:teams},(_,team)=>({room:'office',team,operators:[ids[team]]})),residents:[],dormSupport:{}};const result=simulate(model,plan,{record:true});assert.equal(result.at24.hour,24);assert.equal(result.cycle.hour,teams*24);}
});
test('training ground keeps clear records separate from ordinary stages and does not guess missing account fields',()=>{
 const user={trainingGround:{stages:{ch_1:{state:3},ch_2:{state:0},ch_3:{state:2}}},dungeon:{stages:{'main_03-08':{state:3},ch_2:{state:3}}}};
 const rows=trainingGroundRewards(user);assert.equal(rows[0].status,'claimed');assert.equal(rows[1].status,'remaining');assert.equal(rows.filter(r=>r.status==='remaining').reduce((s,r)=>s+r.amount,0),1200);assert.ok(rows.every(r=>r.access==='바로 도전 가능'));assert.ok(trainingGroundRewards({}).every(r=>r.status==='unknown'));
});
test('Closure module mission translations preserve first deployment and Vanguard exclusion requirements',()=>{
 assert.match(moduleMissionDescription({id:'uniequip_002_closur_1'}),/첫 번째/);assert.match(moduleMissionDescription({id:'uniequip_002_closur_2'}),/BB-4.*3★/);assert.match(moduleMissionDescription({id:'uniequip_002_closur_2'}),/클로저 외에는 뱅가드/);assert.equal(moduleMissionDescription({id:'other',description:'원문'}),'원문');
});
