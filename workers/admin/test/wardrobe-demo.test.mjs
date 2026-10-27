import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHandler} from '../src/index.mjs';
const origin='https://admin.example.test';
const env={ADMIN_ORIGIN:origin,ADMIN_GITHUB_ID:'123',GITHUB_CLIENT_ID:'test',GITHUB_CLIENT_SECRET:'test-secret-with-more-than-32-characters',ASSETS:{async fetch(request){const path=new URL(request.url).pathname;if(path==='/preview/wardrobe')return new Response(await readFile(new URL('../public/wardrobe/preview.html',import.meta.url),'utf8'),{headers:{'Content-Type':'text/html'}});return new Response('static game asset');}}};
const handler=createHandler({fetcher:()=>{throw Error('No upstream requests expected');}});
const get=(path,method='GET')=>handler(new Request(origin+path,{method}),env);
test('anonymous wardrobe demo uses synthetic mode and canonical asset URL',async()=>{
 const r=await get('/wardrobe-demo');assert.equal(r.status,200);const html=await r.text();assert.match(html,/data-wardrobe-demo="true"/);assert.match(html,/href="\/preview\/assets\/css\/zoot.css/);assert.doesNotMatch(html,/<script src="assets\/js\/zoot.js/);assert.equal(r.headers.get('X-Frame-Options'),'DENY');assert.match(r.headers.get('Content-Security-Policy'),/form-action 'none'/);
 assert.equal((await get('/wardrobe-demo','HEAD')).status,200);assert.equal(await (await get('/wardrobe-demo','HEAD')).text(),'');
});
test('only exact demo assets are readable without login; account and admin stay protected',async()=>{
 for(const path of ['/wardrobe/style.css','/wardrobe/ui.js','/wardrobe/sd.js','/wardrobe/original-layout.js','/wardrobe/catalog.json','/wardrobe/sd-models.json','/wardrobe/native-scene.json.gz','/preview/assets/css/zoot.css'])assert.equal((await get(path)).status,200,path);
 for(const path of ['/api/session','/api/files/future','/api/account/sync','/app.js','/index.html','/preview/wardrobe','/preview/wardrobe.html','/wardrobe/preview.html','/preview/index.html','/wardrobe/private.json','/preview/assets/js/account-menu.mjs'])assert.equal((await get(path)).status,401,path);
 for(const path of ['/wardrobe-demo','/api/account/sync','/api/save','/api/refresh','/wardrobe/ui.js'])assert.equal((await get(path,'POST')).status,401,path);
});
