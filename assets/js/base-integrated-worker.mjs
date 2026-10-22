import {trimDormSupport} from './base-dorm-support.mjs?v=3';
import {createTerraModel,INTEGRATED_VERSION} from './infra-v2-terra-model.mjs?v=7';
import {solveHeuristic} from './infra-v2-heuristic.mjs?v=5';
import {score} from './infra-v2-core.mjs?v=5';
self.onmessage=({data})=>{
 try{
  const catalog={...data.catalog,fingerprint:data.catalog.fingerprint??data.catalog.source.blob},model=createTerraModel(catalog,data.input);
  self.postMessage({type:'started',owned:model.pool.length});
  const report=solveHeuristic(model,{maxMilliseconds:data.seconds*1000,exactThreshold:10000,starts:2,onProgress:progress=>self.postMessage({type:'progress',progress})});
  if(report.best){const cleaned=trimDormSupport(model,report.best.plan);report.best={...report.best,...cleaned.result,plan:cleaned.plan,score:score(model,cleaned.result)};}
  self.postMessage({type:'result',result:{...report,modelVersion:INTEGRATED_VERSION,warnings:[...(data.warnings??[]),...model.warnings],operators:Object.fromEntries(model.pool.map(o=>[o.id,{id:o.id,name:o.name}])),rooms:model.rooms.map(r=>({id:r.id,type:r.type,level:r.level})),input:model.input}});
 }catch(error){self.postMessage({type:'error',message:error.message});}
};
