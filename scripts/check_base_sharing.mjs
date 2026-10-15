// Synthetic public fixture: checks the deployed endpoint without any user account data.
import fs from 'node:fs';
import {prepareModel,simulatePlan} from '../assets/js/base-optimizer.mjs';
import {makeSubmission} from '../assets/js/base-share.mjs';
const data=JSON.parse(fs.readFileSync(new URL('../data/base-optimizer.json',import.meta.url)));
const base={rooms:{slot_25:{type:'MANUFACTURE',level:1},slot_28:{type:'DORMITORY',level:5,ambience:5000}}};
const progress={char_500_noirc:{owned:true,elite:0,level:1},char_122_beagle:{owned:true,elite:0,level:1}};
const options={teams:2,rotation:'12h',extraActions:false,priority:['F_GOLD','F_EXP','F_DIAMOND'],ambience:{},missingClues:[1,4,7]},products={slot_25:'4'};
const model=prepareModel(data,base,progress,products,options),plan={rooms:model.rooms.filter(r=>r.type!=='DORMITORY'),teams:[[[0]],[[1]]],residents:[],support:[]};
if(!simulatePlan(model,plan,{cycles:10}).valid)throw Error('Synthetic fixture invalid');
const payload=makeSubmission(data,base,progress,products,options,{pool:model.pool,plan});
const url='https://arknights-account-import.jo625540.workers.dev/optimizer-submissions';
let last='';
for(let attempt=0;attempt<24;attempt++){
 try{
  const response=await fetch(url,{method:'POST',headers:{Origin:'https://moonwhale-ko.github.io','Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(15000)});
  const body=await response.json();last=`HTTP ${response.status}: ${body.error??body.status??'unknown'}`;
  if(response.status===202&&body.ok&&body.id){fs.writeFileSync('/tmp/base-sharing-smoke-id',body.id);console.log('Synthetic submission accepted:',body.id);process.exit(0);}
 }catch(error){last=error.name;}
 if(attempt%4===0)console.log('Waiting for Worker deployment:',last);
 await new Promise(resolve=>setTimeout(resolve,10000));
}
throw Error('Deployed Worker submission check failed: '+last);
