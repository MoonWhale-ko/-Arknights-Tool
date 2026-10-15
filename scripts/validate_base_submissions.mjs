// Input: D1 JSON export/query output. Output: only recalculated valid candidates.
import fs from 'node:fs';
import {validateSubmission,decodePlan,conditionKey} from '../assets/js/base-share.mjs';
import {prepareModel,simulatePlan,compareScores} from '../assets/js/base-optimizer.mjs';
const [input,output]=process.argv.slice(2);
if(!input||!output)throw Error('Usage: node scripts/validate_base_submissions.mjs submissions.json candidates.json');
const data=JSON.parse(fs.readFileSync(new URL('../data/base-optimizer.json',import.meta.url))),raw=JSON.parse(fs.readFileSync(input));
const rows=raw[0]?.results??raw,accepted=new Map();let rejected=0;
if(fs.existsSync(output)){const old=JSON.parse(fs.readFileSync(output));for(const c of old.candidates??[])rows.push(c.input);}
for(const row of rows){try{const p=validateSubmission(typeof row.payload==='string'?JSON.parse(row.payload):row);if(p.source!==data.source.blob)throw Error('source-mismatch');const model=prepareModel(data,p.base,p.progress,p.products,p.options);if(model.missing.length)throw Error('missing-input');const result=simulatePlan(model,decodePlan(model,p.plan),{cycles:10});if(!result.valid)throw Error('invalid-plan');const key=conditionKey(p),old=accepted.get(key);if(!old||compareScores(result.score,old.score)>0)accepted.set(key,{input:p,score:result.score});}catch{rejected++;}}
fs.writeFileSync(output,JSON.stringify({version:1,candidates:[...accepted.values()]}));console.log(`Accepted ${accepted.size}, rejected ${rejected}. Review before publishing.`);
