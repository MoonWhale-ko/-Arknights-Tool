const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const path=require('node:path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'recruitment.html'),'utf8');
const source=html.split('<script>')[1].split('</script>')[0];
const data=JSON.parse(fs.readFileSync(path.join(root,'data/operators.json'),'utf8'));
function element(){return {value:'',hidden:false,innerHTML:'',textContent:'',checked:false,dataset:{},children:[],attrs:{},classList:{values:new Set(),toggle(k,on){if(on===undefined)on=!this.values.has(k);if(on)this.values.add(k);else this.values.delete(k);return on},contains(k){return this.values.has(k)},add(k){this.values.add(k)},remove(k){this.values.delete(k)}},setAttribute(k,v){this.attrs[k]=v},focus(){},appendChild(x){this.children.push(x)},insertAdjacentHTML(where,s){this.innerHTML+=s}}}
const ids=new Map(),tags=[],rarities=[],times=[];
const doc={getElementById(id){if(!ids.has(id))ids.set(id,element());return ids.get(id)},createElement(){return element()},querySelectorAll(sel){if(sel==='.tag'){
 if(!tags.length){const groups=JSON.parse(vm.runInContext('JSON.stringify(groups)',context));for(const tag of Object.values(groups).flat()){const e=element();e.dataset.tag=tag;tags.push(e)}}return tags;
 }if(sel==='.time-button'){if(!times.length)for(let h=1;h<=9;h++){const e=element();e.dataset.hours=String(h);times.push(e)}return times;}if(sel==='.rarity'){if(!rarities.length)for(let r=1;r<=6;r++){const e=element();e.dataset.r=String(r);rarities.push(e)}return rarities;}return []},addEventListener(){}};
const progress={char_285_medic2:{owned:true,elite:0,level:30}};
let writes=0;const storage={'arknightsOperatorProgressV1':JSON.stringify(progress)};
const listeners={};const context=vm.createContext({document:doc,window:{addEventListener(k,f){listeners[k]=f}},localStorage:{getItem:k=>storage[k]||null,setItem(k,v){writes++;storage[k]=v}},fetch:()=>Promise.resolve({json:()=>Promise.resolve(data)}),console});
vm.runInContext(source,context);
(async()=>{
 await new Promise(resolve=>setImmediate(resolve));
 function choose(names){vm.runInContext(`selected.splice(0);selected.push(...${JSON.stringify(names)});render()`,context);return ids.get('results').innerHTML}
 const typed=value=>{ids.get('tagSearch').value=value;ids.get('tagSearch').oninput()};
 const selection=()=>JSON.parse(vm.runInContext('JSON.stringify(selected)',context));
 const before=JSON.stringify(storage);
 typed('고근힐딜신');assert.deepEqual(selection(),['고급 특별 채용','근거리','힐링','딜러','신입']);assert.equal(ids.get('selCount').textContent,'5 / 5');
 typed('고스');assert.deepEqual(selection(),['고급 특별 채용']);
 for(const t of ['스나이퍼','스페셜리스트'])assert.ok(tags.find(b=>b.dataset.tag===t).classList.contains('ambiguous'));
 assert.ok(!tags.find(b=>b.dataset.tag==='고급 특별 채용').classList.contains('ambiguous'));assert.equal(ids.get('tagSearchEmpty').hidden,false);
 tags.find(b=>b.dataset.tag==='스나이퍼').onclick();assert.deepEqual(selection(),['고급 특별 채용','스나이퍼']);assert.ok(tags.every(b=>!b.classList.contains('ambiguous')));
 tags.find(b=>b.dataset.tag==='스페셜리스트').onclick();assert.deepEqual(selection(),['고급 특별 채용','스페셜리스트']);
 typed('고');typed('스');assert.deepEqual(selection(),[],'Removed ambiguous choices are forgotten');
 typed('고 고 근');assert.deepEqual(selection(),['고급 특별 채용','근거리']);
 typed('고근힐딜신가');assert.equal(selection().length,5);assert.match(ids.get('tagSearchEmpty').textContent,/최대 5개/);
 typed('고근힐딜신스');tags.find(b=>b.dataset.tag==='스나이퍼').onclick();assert.equal(selection().length,5);assert.ok(tags.find(b=>b.dataset.tag==='스나이퍼').classList.contains('ambiguous'));
 typed('ㄱ');assert.deepEqual(selection(),[]);assert.match(ids.get('tagSearchEmpty').textContent,/해당하는 태그가 없습니다/);
 typed('고');ids.get('tagSearch').value='고근';ids.get('tagSearch').oninput({isComposing:true});assert.deepEqual(selection(),['고급 특별 채용','근거리']);ids.get('tagSearch').oncompositionend();assert.deepEqual(selection(),['고급 특별 채용','근거리']);
 ids.get('tagSearch').value='고근힐딜신';ids.get('tagSearch').oninput({isComposing:true});assert.equal(selection().length,5,'Korean composing input is processed immediately');
 assert.equal(JSON.stringify(storage),before);
 ids.get('tagReset').onclick();assert.equal(ids.get('tagSearch').value,'');assert.equal(ids.get('tagSearchEmpty').hidden,true);assert.ok(tags.every(b=>!b.classList.contains('ambiguous')));
 assert.equal(ids.get('timeValue').textContent,'9시간');
 let result=choose(['로봇']);assert.match(result,/표시할 조합이 없습니다/);
 times[0].onclick();result=choose(['로봇']);
 assert.match(result,/aria-label="Lancet-2 · 보유"/);
 assert.ok(!/class="op r1 unowned" data-id="char_285_medic2"/.test(result));
 assert.match(result,/aria-label="Castle-3 · 미보유"/);
 assert.equal(writes,1,'Only the duration change writes recruitment settings');
 assert.deepEqual(JSON.parse(storage.arknightsOperatorProgressV1),progress);
 result=choose(['근거리']);
 assert.ok(result.includes('data-rarity="2"'));
 const sections=[...result.matchAll(/<section class="rarity-group" data-rarity="(\d)">([\s\S]*?)<\/section>/g)];
 for(const [,rarity,body] of sections){const cards=[...body.matchAll(/class="op r(\d)/g)];assert.ok(cards.length);assert.ok(cards.every(x=>x[1]===rarity));}
 result=choose(['고급 특별 채용']);assert.match(result,/최저 6★/);assert.ok(!result.includes('data-rarity="5"'));
 times[8].onclick();
 const candidates=vm.runInContext('operators.filter(o=>eligible(o,["고급 특별 채용"])).length',context);assert.equal(candidates,33);
 choose(['가드','딜러','근거리','지원','생존형']);tags.find(t=>t.dataset.tag==='로봇').onclick();assert.equal(vm.runInContext('selected.length',context),5);
 ids.get('tagReset').onclick();assert.equal(ids.get('selCount').textContent,'0 / 5');
 ids.get('settingsBtn').onclick();assert.equal(ids.get('settingsBtn').attrs['aria-expanded'],'true');ids.get('settingsClose').onclick();assert.equal(ids.get('settingsBtn').attrs['aria-expanded'],'false');
 times[0].onclick();
 storage.arknightsOperatorProgressV1=JSON.stringify({char_285_medic2:{owned:false}});choose(['로봇']);listeners.storage({key:'arknightsOperatorProgressV1'});assert.match(ids.get('results').innerHTML,/class="op r1 unowned" data-id="char_285_medic2"/);
 storage.arknightsOperatorProgressV1='invalid JSON';assert.doesNotThrow(()=>choose(['로봇']));
 for(let h=1;h<=9;h++){times[h-1].onclick();const rs=JSON.parse(vm.runInContext('JSON.stringify([...new Set(operators.filter(o=>eligible(o,["근거리"])).map(o=>o.rarity))].sort())',context));assert.deepEqual(rs,h<4?[1,2,3,4]:h<8?[2,3,4,5]:[3,4,5]);assert.equal(JSON.parse(storage.akRecruitSettings).hours,h);assert.equal(times.filter(t=>t.attrs['aria-pressed']==='true').length,1);assert.match(choose(['고급 특별 채용']),/최저 6★/);assert.match(choose(['특별 채용']),/최저 5★/)}
 ids.get('reset').onclick();assert.equal(JSON.parse(storage.akRecruitSettings).hours,9);assert.equal(storage.arknightsOperatorProgressV1,'invalid JSON');
 console.log('Recruitment checks passed: actual IDs, ownership glow, rarity rows, 6-star calculation, five-tag limit, reset, settings, storage refresh and malformed storage.');
})().catch(e=>{console.error(e);process.exitCode=1});
