import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import http from 'node:http';
import { once } from 'node:events';
import { createApp } from '../server/app.js';
import { createDeploymentChecks } from '../server/deployment.js';
const key='before-installation-check-test-key';

async function fixture(t) {
 const dir=await mkdtemp(join(tmpdir(),'before-deployment-'));
 const app=createApp({storePath:join(dir,'state.json'),gatewayKey:key});
 const server=http.createServer(app);server.listen(0,'127.0.0.1');await once(server,'listening');
 const base=`http://127.0.0.1:${server.address().port}`;let cookie;
 async function request(path,{method='GET',body,role=false,origin}={}){
  const response=await fetch(base+path,{method,headers:{'x-before-gateway-key':key,...(body===undefined?{}:{'content-type':'application/json'}),...(role?{cookie}:{}),...(origin?{origin}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
  return {status:response.status,data:await response.json(),response};
 }
 const login=await request('/api/session',{method:'POST',body:{role:'moderator'}});cookie=login.response.headers.get('set-cookie').split(';')[0];
 t.after(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));await rm(dir,{recursive:true,force:true});});
 return {app,request};
}

test('deployment walkthrough requires the correct installation, origin and ordered receipts without persisting visitor data',async t=>{
 const {app,request}=await fixture(t);const path='/api/moderator/sites/demo-forum/deployment';
 assert.equal((await request(path)).status,403);
 assert.equal((await request(path,{method:'POST',role:true,body:{url:'http://unapproved.example'}})).status,400);
 const before=JSON.stringify(app.locals.store.read());
 const started=await request(path,{method:'POST',role:true,body:{}});
 assert.equal(started.status,200);assert.equal(started.data.verification.status,'checking');
 const token=new URL(started.data.testUrl).searchParams.get('before_check');assert.match(token,/^[a-f0-9]{32}$/);
 const receipt='/api/public/sites/demo-forum/deployment-check';
 assert.equal((await request(receipt,{method:'POST',origin:'http://localhost:3000',body:{token,step:'rendered'}})).status,403);
 assert.equal((await request(receipt,{method:'POST',origin:'http://localhost:3004',body:{token,step:'sdk'}})).status,403);
 assert.equal((await request(receipt,{method:'POST',origin:'http://localhost:3000',body:{token,step:'sdk',input:'never collected'}})).status,400);
 for(const step of ['sdk','submitted','rendered'])assert.equal((await request(receipt,{method:'POST',origin:'http://localhost:3000',body:{token,step}})).status,200);
 const finished=await request(path,{role:true});assert.equal(finished.data.verification.status,'verified');assert.ok(finished.data.verification.checkedAt);
 assert.deepEqual(finished.data.verification.steps,{sdk:true,submitted:true,rendered:true});
 assert.equal(JSON.stringify(app.locals.store.read()),before);
});

test('checks target actual installation addresses and expire without proving an installation from asset availability',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'before-check-unit-'));const asset=join(dir,'before.js');await writeFile(asset,'built package');t.after(()=>rm(dir,{recursive:true,force:true}));
 let now=1000000;const checks=createDeploymentChecks({frontendOrigin:'http://localhost:3000',packagePath:asset,clock:()=>now});
 const site={id:'wordpress',returnUrl:'http://localhost:9400/',origins:['http://localhost:9400']};const context={country:'NL',publication:'site:wordpress@1',configured:true};
 assert.equal(checks.read(site,context).verification.status,'not_checked');
 const started=checks.start(site,context);assert.equal(new URL(started.testUrl).origin,'http://localhost:9400');
 assert.equal(started.checks.every(check=>check.status==='passed'),true);assert.equal(started.verification.status,'checking');
 const token=new URL(started.testUrl).searchParams.get('before_check');
 assert.equal(checks.receipt('different-site',token,'sdk','http://localhost:9400'),false);
 now+=10*60*1000+1;assert.equal(checks.read(site,context).verification.status,'expired');assert.equal(checks.receipt(site.id,token,'sdk','http://localhost:9400'),false);
 const invalid=checks.start({...site,returnUrl:'http://unapproved.example'},context);assert.equal(invalid.checks.find(check=>check.id==='origin').status,'failed');assert.equal(invalid.testUrl,null);
});

test('hosted Fieldnotes diagnostics use the public origin while local rehearsals retain the separate fixture',()=>{
 const site={id:'demo-fieldnotes',returnUrl:'/demo/fieldnotes',origins:['http://localhost:3004','https://data-compass.org']};
 const context={country:'NL',publication:'site:demo-fieldnotes@1',configured:true};
 for(const [frontendOrigin,expected] of [['http://localhost:3000','http://localhost:3004'],['https://data-compass.org','https://data-compass.org']]){
  const checks=createDeploymentChecks({frontendOrigin,packagePath:new URL('../dist/embed/before.js',import.meta.url).pathname});
  assert.equal(new URL(checks.start(site,context).testUrl).origin,expected);
 }
});

test('research participation summaries count only installations opted in to the current publication',async t=>{
 const {app,request}=await fixture(t);
 const login=await request('/api/session',{method:'POST',body:{role:'researcher'}});const cookie=login.response.headers.get('set-cookie').split(';')[0];
 const server=http.createServer(app);server.listen(0,'127.0.0.1');await once(server,'listening');t.after(async()=>{server.closeAllConnections();await new Promise(r=>server.close(r));});
 const url=`http://127.0.0.1:${server.address().port}/api/researcher/studies/reflection-first`;
 async function read(){return fetch(url,{headers:{'x-before-gateway-key':key,cookie}}).then(r=>r.json());}
 assert.equal((await read()).participation.platforms,0);
 await app.locals.store.transact(state=>{state.sites['demo-forum'].enrolment={studyRevision:'reflection-first@1',enabled:true};state.sites.wordpress.enrolment={studyRevision:'reflection-first@1',enabled:false};});
 assert.deepEqual((await read()).participation,{platforms:1,allocation:'per_exposure',scope:'opted_in_platforms'});
 await app.locals.store.transact(state=>{state.studies['reflection-first'].publications.push({...state.studies['reflection-first'].publications[0],key:'reflection-first@2',revision:2});});
 assert.equal((await read()).participation.platforms,0);
});

test('SDK diagnostics carry only challenge metadata and keep ordinary installations silent',async()=>{
 const {createBefore}=await import('../packages/browser/src/index.js');
 const token='a'.repeat(32);const requests=[];const destinations=[];
 const client=createBefore({document:new EventTarget(),location:{href:`http://localhost:3004/demo/fieldnotes?before_check=${token}`},languages:['en'],navigate:url=>destinations.push(url),fetch:async(url,options)=>{requests.push({url,options});return {ok:true,json:async()=>({arms:[{id:'default'}]})};}});
 await client.init({endpoint:'http://localhost:3000',siteId:'demo-fieldnotes'});
 await client.intervene({type:'search',severity:'high',text:'input must stay local'});
 const receipts=requests.filter(request=>request.url.endsWith('/deployment-check'));
 assert.deepEqual(receipts.map(request=>JSON.parse(request.options.body)),[{token,step:'sdk'},{token,step:'submitted'}]);
 for(const receipt of receipts){assert.equal(receipt.options.credentials,'omit');assert.equal(receipt.options.referrerPolicy,'no-referrer');}
 const url=new URL(destinations[0]);assert.equal(url.searchParams.get('before_check'),token);assert.equal(url.searchParams.get('preview'),'1');assert.equal(url.href.includes('input'),false);client.destroy();
});

test('a study distributes its published allocation across opted-in installations and counts participation per revision', async t => {
  const { app, request } = await fixture(t);
  const study = app.locals.store.read().studies['reflection-first'];
  const revision = study.publications[0];
  const join = (siteId, enabled) => request(`/api/moderator/sites/${siteId}/enrolment`, {
    method: 'PUT', role: true, body: { studyRevision: revision.key, enabled },
  });
  assert.equal((await join('demo-forum', true)).status, 200);
  assert.equal((await join('demo-fieldnotes', true)).status, 200);
  const configs = await Promise.all(['demo-forum', 'demo-fieldnotes'].map(siteId => request(`/api/public/sites/${siteId}/config?lang=en&country=NL`)));
  for (const { status, data } of configs) {
    assert.equal(status, 200);
    assert.equal(data.studyRevision, revision.key);
    assert.deepEqual(data.arms.map(({ id, weight, intervention }) => ({ id, weight, title: intervention.en.title })), revision.arms.map(({ id, weight, intervention }) => ({ id, weight, title: intervention.en.title })));
  }
  const login = await request('/api/session', { method: 'POST', body: { role: 'researcher' } });
  const researcherCookie = login.response.headers.get('set-cookie').split(';')[0];
  const server = http.createServer(app); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const researcher = async (suffix = '', options = {}) => {
    const response = await fetch(`${base}/api/researcher/studies/reflection-first${suffix}`, {
      ...options, headers: { 'x-before-gateway-key': key, cookie: researcherCookie, 'Content-Type': 'application/json' },
    });
    assert.equal(response.status, 200); return response.json();
  };
  assert.deepEqual((await researcher()).participation, { platforms: 2, allocation: 'per_exposure', scope: 'opted_in_platforms' });
  assert.equal((await join('demo-fieldnotes', false)).status, 200);
  assert.equal((await researcher()).participation.platforms, 1);
  const priorEnrolments = Object.fromEntries(['demo-forum', 'demo-fieldnotes'].map(siteId => [siteId, app.locals.store.read().sites[siteId].enrolment]));
  const published = await researcher('/publish', { method: 'POST', body: '{}' });
  assert.equal(published.publications.at(-1).revision, 2);
  assert.equal(published.participation.platforms, 0);
  for (const [siteId, enrolment] of Object.entries(priorEnrolments)) assert.deepEqual(app.locals.store.read().sites[siteId].enrolment, enrolment);
  const active = await request('/api/public/sites/demo-forum/config?lang=en&country=NL');
  assert.equal(active.data.studyRevision, revision.key);
  const withdrawn = await request('/api/public/sites/demo-fieldnotes/config?lang=en&country=NL');
  assert.equal(withdrawn.data.studyRevision, 'site:demo-fieldnotes@1');
});
