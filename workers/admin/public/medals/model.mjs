export function medalState(medal,records={}){
 const base=records[medal.id],advanced=medal.advanced&&records[medal.advanced];
 const acquired=Number(base?.fts)>0,trimmed=Number(advanced?.fts)>0;
 return {owned:acquired||trimmed,trimmed,acquiredAt:acquired?base.fts:trimmed?advanced.fts:null,progress:Array.isArray(base?.val)?base.val.filter(v=>Array.isArray(v)&&v.length===2&&v.every(Number.isFinite)).map(([current,target])=>({current,target})):[]};
}
export function accountMedals(data){const user=data?.snapshot?.user??data?.user??data?.rewards?.user;return user?.medal?.medals&&typeof user.medal.medals==='object'?user.medal.medals:null;}
export const gameText=text=>String(text??'').replace(/<[^>]*>/g,'').replace(/\\n/g,'\n');
