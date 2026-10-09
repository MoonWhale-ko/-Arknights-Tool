const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const path=require('node:path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'recruitment.html'),'utf8');
const source=html.split('<script>')[1].split('</script>')[0];
const data=JSON.parse(fs.readFileSync(path.join(root,'data/operators.json'),'utf8'));
function element(){return {value:'',hidden:false,innerHTML:'',textContent:'',checked:false,dataset:{},children:[],attrs:{},classList:{values:new Set(),toggle(k,on){if(on===undefined)on=!this.values.has(k);if(on)this.values.add(k);else this.values.delete(k);return on},contains(k){return this.values.has(k)},add(k){this.values.add(k)},remove(k){this.values.delete(k)}},setAttribute(k,v){this.attrs[k]=v},focus(){},appendChild(x){this.children.push(x)},insertAdjacentHTML(where,s){this.innerHTML+=s}}}
const ids=new Map(),tags=[],rarities=[];
const doc={getElementById(id){if(!ids.has(id))ids.set(id,element());return ids.get(id)},createElement(){return element()},querySelectorAll(sel){if(sel==='.tag'){
 if(!tags.length){const groups=JSON.parse(vm.runInContext('JSON.stringify(groups)',context));for(const tag of Object.values(groups).flat()){const e=element();e.dataset.tag=tag;tags.push(e)}}return tags;
 }if(sel==='.rarity'){if(!rarities.length)for(let r=1;r<=6;r++){const e=element();e.dataset.r=String(r);rarities.push(e)}return rarities;}return []},addEventListener(){}};
const progress={char_285_medic2:{owned:true,elite:0,level:30}};
let writes=0;const storage={'arknightsOperatorProgressV1':JSON.stringify(progress)};
const listeners={};const context=vm.createContext({document:doc,window:{addEventListener(k,f){listeners[k]=f}},localStorage:{getItem:k=>storage[k]||null,setItem(k,v){writes++;storage[k]=v}},fetch:()=>Promise.resolve({json:()=>Promise.resolve(data)}),console});
vm.runInContext(source,context);
(async()=>{
 await new Promise(resolve=>setImmediate(resolve));
 function choose(names){vm.runInContext(`selected.splice(0);selected.push(...${JSON.stringify(names)});render()`,context);return ids.get('results').innerHTML}
 const matches=(tag,q)=>vm.runInContext(`matchesTag(${JSON.stringify(tag)},${JSON.stringify(q)})`,context);
 assert.ok(matches('고급 특별 채용','고'));assert.ok(matches('고급 특별 채용','ㄱㄱ'));assert.ok(matches('고급 특별 채용','고ㄱㅌ'));
 assert.ok(matches('코스트+','ㅋㅅ'));assert.ok(matches('근거리','ㄱㄱ'));assert.ok(!matches('원거리','거리'));assert.ok(!matches('가드','ㄱㄱ'));assert.ok(!matches('가드','가드더'));
 assert.ok(matches('쾌속부활',' ㅋ ㅅ '));assert.ok(matches('가드',''));assert.ok(matches('캐스터','캐'.normalize('NFD')));
 choose(['가드']);const before=JSON.stringify(storage);
 ids.get('tagSearch').value='ㄱㄱ';ids.get('tagSearch').oninput();
 assert.ok(!tags.find(t=>t.dataset.tag==='고급 특별 채용').hidden);assert.ok(!tags.find(t=>t.dataset.tag==='근거리').hidden);assert.ok(tags.find(t=>t.dataset.tag==='가드').hidden);
 assert.equal(vm.runInContext('selected[0]',context),'가드');assert.equal(JSON.stringify(storage),before);
 ids.get('tagSearch').value='없는태그';ids.get('tagSearch').oninput();assert.equal(ids.get('tagSearchEmpty').hidden,false);
 ids.get('tagReset').onclick();assert.equal(ids.get('tagSearch').value,'');assert.ok(tags.every(t=>!t.hidden));assert.equal(ids.get('tagSearchEmpty').hidden,true);
 let result=choose(['로봇']);
 assert.match(result,/aria-label="Lancet-2 · 보유"/);
 assert.ok(!/class="op r1 unowned" data-id="char_285_medic2"/.test(result));
 assert.match(result,/aria-label="Castle-3 · 미보유"/);
 assert.equal(writes,0,'Reading ownership must not rewrite saved progress');
 assert.deepEqual(JSON.parse(storage.arknightsOperatorProgressV1),progress);
 result=choose(['근거리']);
 assert.ok(result.includes('data-rarity="2"'));
 const sections=[...result.matchAll(/<section class="rarity-group" data-rarity="(\d)">([\s\S]*?)<\/section>/g)];
 for(const [,rarity,body] of sections){const cards=[...body.matchAll(/class="op r(\d)/g)];assert.ok(cards.length);assert.ok(cards.every(x=>x[1]===rarity));}
 result=choose(['고급 특별 채용']);assert.match(result,/최저 6★/);assert.ok(!result.includes('data-rarity="5"'));
 const candidates=vm.runInContext('operators.filter(o=>eligible(o,["고급 특별 채용"])).length',context);assert.equal(candidates,33);
 choose(['가드','딜러','근거리','지원','생존형']);tags.find(t=>t.dataset.tag==='로봇').onclick();assert.equal(vm.runInContext('selected.length',context),5);
 ids.get('tagReset').onclick();assert.equal(ids.get('selCount').textContent,'0 / 5');
 ids.get('settingsBtn').onclick();assert.equal(ids.get('settingsBtn').attrs['aria-expanded'],'true');ids.get('settingsClose').onclick();assert.equal(ids.get('settingsBtn').attrs['aria-expanded'],'false');
 storage.arknightsOperatorProgressV1=JSON.stringify({char_285_medic2:{owned:false}});choose(['로봇']);listeners.storage({key:'arknightsOperatorProgressV1'});assert.match(ids.get('results').innerHTML,/class="op r1 unowned" data-id="char_285_medic2"/);
 storage.arknightsOperatorProgressV1='invalid JSON';assert.doesNotThrow(()=>choose(['로봇']));
 console.log('Recruitment checks passed: actual IDs, ownership glow, rarity rows, 6-star calculation, five-tag limit, reset, settings, storage refresh and malformed storage.');
})().catch(e=>{console.error(e);process.exitCode=1});
