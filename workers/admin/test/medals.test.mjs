import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {medalState,accountMedals,gameText} from '../public/medals/model.mjs';import {createHandler} from '../src/index.mjs';
test('progress is not acquisition; trim variants merge into the base medal',()=>{
 const m={id:'base',advanced:'trim'};assert.equal(medalState(m,{base:{fts:-1,val:[[10,10]]}}).owned,false);
 assert.deepEqual(medalState(m,{base:{fts:100,val:[[10,10]]},trim:{fts:-1}}),{owned:true,trimmed:false,acquiredAt:100,progress:[{current:10,target:10}]});
 assert.deepEqual(medalState(m,{trim:{fts:200}}),{owned:true,trimmed:true,acquiredAt:200,progress:[]});
});
test('account wrappers and game formatting are handled without using account identity',()=>{
 const medals={a:{fts:1}};assert.equal(accountMedals({snapshot:{user:{medal:{medals}}}}),medals);assert.equal(accountMedals({user:{}}),null);assert.equal(gameText('<@cc.vup>첫 조건</>\\n다음 조건'),'첫 조건\n다음 조건');
});
test('KR catalog has complete base/trim relationships and unique IDs',async()=>{
 const c=JSON.parse(await readFile(new URL('../public/medals/catalog.json',import.meta.url))),ids=new Set(c.medals.map(m=>m.id));assert.equal(ids.size,c.medals.length);assert.equal(c.source.server,'KR');for(const m of c.medals){if(m.advanced)assert.ok(ids.has(m.advanced));if(m.origin)assert.ok(ids.has(m.origin));}assert.ok(c.medals.filter(m=>!m.origin).length>1000);
});
test('medal preview and its account-facing assets stay authenticated',async()=>{
 const handler=createHandler();for(const path of ['/preview/medals.html','/medals/ui.js','/medals/model.mjs','/medals/catalog.json','/medals/style.css','/medals/preview.html','/medals/native-layout.json','/medals/entry-mesh.png']){const r=await handler(new Request('https://admin.example.test'+path),{ADMIN_ORIGIN:'https://admin.example.test',ADMIN_GITHUB_ID:'123',GITHUB_CLIENT_ID:'test',GITHUB_CLIENT_SECRET:'test-secret-with-more-than-32-characters',ASSETS:{fetch:()=>new Response('asset')}});assert.equal(r.status,401,path);}
});

test('native set placement retains all extracted positions and valid prefab sizes',async()=>{
 const layout=JSON.parse(await readFile(new URL('../public/medals/native-layout.json',import.meta.url)));assert.equal(Object.keys(layout.groups).length,68);assert.equal(Object.values(layout.groups).reduce((n,g)=>n+Object.keys(g.medals).length,0),696);assert.deepEqual(layout.iconSizes,{T1:114,T2:180,T3:256});for(const g of Object.values(layout.groups)){assert.ok(g.width>0&&g.height>0);for(const p of Object.values(g.medals))assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y));}
});
