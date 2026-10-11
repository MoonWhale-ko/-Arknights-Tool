import {optimize} from './base-engine.mjs?v=1';
self.onmessage=({data:{pool,settings,data}})=>{try{self.postMessage({result:optimize(pool,settings,data)})}catch(error){self.postMessage({error:error.message})}};
