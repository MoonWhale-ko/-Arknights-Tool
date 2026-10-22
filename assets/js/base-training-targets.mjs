import {kt} from './infra-v2-terra-engine.mjs';
const condition=skill=>({elite:Number(skill.unlock.match(/정예화\s*(\d+)/)?.[1]??0),level:Number(skill.unlock.match(/Lv\.\s*(\d+)/)?.[1]??1)});
export function nextInfrastructureUnlock(def,current){
 const old=kt(def,current.elite,current.level).skills;
 const points=[...new Map(def.skills.flatMap(s=>[...s.tiers??[],s]).map(s=>{const p=condition(s);return [p.elite+':'+p.level,p];})).values()].filter(p=>p.elite>current.elite||p.elite===current.elite&&p.level>current.level).sort((a,b)=>a.elite-b.elite||a.level-b.level);
 for(const target of points){const skills=kt(def,target.elite,target.level).skills.filter(s=>!old.some(previous=>previous.buffId===s.buffId));if(skills.length)return {target,skills:skills.map(s=>({id:s.buffId,name:s.name,room:s.room}))};}
 return null;
}
