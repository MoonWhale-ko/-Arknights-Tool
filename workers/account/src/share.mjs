import {validateSubmission} from '../../../assets/js/base-share.mjs';
export async function acceptSubmission(request,env,reply){
 if(!env.OPTIMIZER_DB||!env.IP_LIMIT)return reply({ok:false,error:'sharing-not-configured'},503);
 if(!(await env.IP_LIMIT.limit({key:'share:'+ (request.headers.get('CF-Connecting-IP')||'unknown')})).success)return reply({ok:false,error:'too-many'},429);
 if(!request.headers.get('Content-Type')?.startsWith('application/json'))return reply({ok:false,error:'invalid-submission'},415);
 const reader=request.body?.getReader();if(!reader)return reply({ok:false,error:'invalid-submission'},400);
 let size=0;const chunks=[];
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>100000){await reader.cancel();return reply({ok:false,error:'too-large'},413);}chunks.push(value);}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 let payload;try{payload=validateSubmission(JSON.parse(new TextDecoder().decode(bytes)));}catch{return reply({ok:false,error:'invalid-submission'},400);}
 const body=JSON.stringify(payload),hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(body)),id=Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
 try{await env.OPTIMIZER_DB.prepare('INSERT OR IGNORE INTO optimizer_submissions (id, payload, created_at) VALUES (?, ?, ?)').bind(id,body,new Date().toISOString()).run();return reply({ok:true,id,status:'pending-validation'},202);}catch{return reply({ok:false,error:'storage-unavailable'},503);}
}
