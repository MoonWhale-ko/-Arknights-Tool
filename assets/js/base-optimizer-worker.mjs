import {prepareModel,optimizeBase} from './base-optimizer.mjs';
self.onmessage=async event=>{
 try{
  const {data,base,progress,products,options}=event.data;
  const model=prepareModel(data,base,progress,products,options);
  const result=await optimizeBase(model,{onProgress:progress=>self.postMessage({type:'progress',progress})});
  self.postMessage({type:'result',result});
 }catch(error){self.postMessage({type:'error',message:error.message});}
};
