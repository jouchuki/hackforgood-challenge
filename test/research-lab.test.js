import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,stat,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {once} from 'node:events';
import http from 'node:http';
import {createPostHogBridge} from '../server/research-lab.js';
import {createStore,seedState} from '../server/store.js';
import {makeReport,addCounts} from '../server/reports.js';
import {PATH_COUNTERS} from '../core/model.js';
import {createApp} from '../server/app.js';
const token='phc_synthetic_fixture_for_tests_only';
const response=()=>({ok:true,json:async()=>({status:1})});
async function fixture(t){const dir=await mkdtemp(join(tmpdir(),'next-step-lab-'));t.after(()=>rm(dir,{recursive:true,force:true}));return dir;}

test('PostHog connection stores the project token privately and restricts outbound destinations',async t=>{
 const dir=await fixture(t),file=join(dir,'posthog.json');const bridge=createPostHogBridge({filePath:file});
 assert.equal(bridge.read().configured,false);
 await assert.rejects(bridge.save({region:'http://localhost:3001',projectKey:token}));
 await assert.rejects(bridge.save({region:'eu',projectKey:token,host:'http://localhost:3001'}));
 const saved=await bridge.save({region:'eu',projectKey:token,projectId:'123'});
 assert.equal(saved.configured,true);assert.doesNotMatch(JSON.stringify(saved),new RegExp(token));assert.equal((await stat(file)).mode&0o777,0o600);
 await bridge.save({region:'eu',projectKey:'',projectId:'123'});assert.equal(JSON.parse(await readFile(file,'utf8')).projectKey,token);
});

test('PostHog exports suppressed aggregate snapshots with batch identities and deduplicates unchanged exports',async t=>{
 const dir=await fixture(t),calls=[];const bridge=createPostHogBridge({filePath:join(dir,'posthog.json'),fetcher:async(url,options)=>{calls.push({url,options});return response();}});
 await bridge.save({region:'eu',projectKey:token,projectId:'123'});
 const state=seedState();const report=makeReport(state,{studyId:'reflection-first',source:'simulation'});report.rows[0].name='PRIVATE_ORIGINAL_TEXT';report.rows[0].counts.help_selected=null;
 const context={studyId:'reflection-first',source:'simulation'};const exported=await bridge.exportReport(report,context);
 assert.equal(exported.eventCount,2);assert.equal(calls.length,1);assert.equal(calls[0].url,'https://eu.i.posthog.com/batch/');assert.equal(calls[0].options.redirect,'error');
 const payload=JSON.parse(calls[0].options.body);assert.equal(payload.api_key,token);assert.doesNotMatch(calls[0].options.body,/PRIVATE_ORIGINAL_TEXT|session_id|window_id|browser|visitor_id/);
 for(const event of payload.batch){assert.equal(event.properties.$process_person_profile,false);assert.equal(event.properties.$geoip_disable,true);assert.equal(event.properties.$ip,null);assert.match(event.properties.distinct_id,/^aggregate:/);assert.equal(event.properties.unit,'intervention_exposures');}
 assert.equal(payload.batch[0].properties.help_selected,null);
 const again=await bridge.exportReport(report,context);assert.equal(again.alreadyExported,true);assert.equal(again.exportId,exported.exportId);assert.equal(calls.length,1);
 const changed=structuredClone(report);changed.rows[0].counts.shown+=10;await bridge.exportReport(changed,context);assert.equal(calls.length,2);const historical=await bridge.exportReport(report,context);assert.equal(historical.exportId,exported.exportId);assert.equal(historical.alreadyExported,true);assert.equal(calls.length,2);assert.equal(bridge.read().lastExport.exportId,exported.exportId);
});

test('PostHog refuses small cells and sanitizes provider failures without reporting success',async t=>{
 const dir=await fixture(t);const bridge=createPostHogBridge({filePath:join(dir,'posthog.json'),fetcher:async()=>{throw Error('Provider diagnostic '+token);}});await bridge.save({region:'us',projectKey:token});
 await assert.rejects(bridge.exportReport({threshold:10,rows:[{counts:{shown:null}}]},{}),/no reportable/i);
 await assert.rejects(bridge.exportReport(makeReport(seedState(),{studyId:'reflection-first',source:'simulation'}),{studyId:'reflection-first'}),error=>!error.message.includes(token)&&error.code==='posthog_unavailable');
 assert.equal(bridge.read().lastExport,null);
});

test('path-counter migration preserves old publications and never invents historical connections',async t=>{
 const dir=await fixture(t),path=join(dir,'state.json');const state=seedState();const publications=JSON.stringify(state.sites);for(const bucket of Object.values(state.buckets))for(const key of PATH_COUNTERS)delete bucket.counts[key];await writeFile(path,JSON.stringify(state));const store=createStore(path);const migrated=store.read();assert.equal(JSON.stringify(migrated.sites),publications);for(const bucket of Object.values(migrated.buckets))for(const key of PATH_COUNTERS)assert.equal(bucket.counts[key],0);
 const bucket=Object.values(migrated.buckets)[0];addCounts(migrated,bucket,{path_measured:1,path_education_support:1});assert.equal(migrated.buckets[JSON.stringify([bucket.siteId,bucket.studyRevision,bucket.armId,bucket.day,bucket.source])].counts.path_education_support,1);
});

test('research lab saves views and exports only through researcher-authorized endpoints',async t=>{
 const dir=await fixture(t);let sends=0;const bridge=createPostHogBridge({filePath:join(dir,'posthog.json'),fetcher:async()=>{sends++;return response();}});const gateway='synthetic-lab-gateway-secret';const app=createApp({storePath:join(dir,'state.json'),gatewayKey:gateway,posthogBridge:bridge});const server=http.createServer(app);server.listen(0,'127.0.0.1');await once(server,'listening');t.after(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));});const base=`http://127.0.0.1:${server.address().port}`;
 const call=(path,{method='GET',body,cookie}={})=>fetch(base+path,{method,headers:{'x-before-gateway-key':gateway,...(cookie?{Cookie:cookie}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});const login=async role=>(await call('/api/session',{method:'POST',body:{role}})).headers.get('set-cookie').split(';')[0];
 assert.equal((await call('/api/researcher/lab')).status,403);const moderator=await login('moderator');assert.equal((await call('/api/researcher/lab',{cookie:moderator})).status,403);const researcher=await login('researcher');assert.equal((await call('/api/researcher/lab',{cookie:researcher})).status,200);
 const view={name:'Help by variant',studyId:'reflection-first',metric:'help_rate',view:'bars',source:'simulation'};assert.equal((await call('/api/researcher/insights',{method:'POST',cookie:researcher,body:{...view,metric:'session_id'}})).status,400);
 const saved=await call('/api/researcher/insights',{method:'POST',cookie:researcher,body:view});assert.equal(saved.status,201);const insight=await saved.json();assert.equal((await call('/api/researcher/lab',{cookie:researcher})).status,200);assert.equal((await call('/api/researcher/insights/'+insight.id,{method:'DELETE',cookie:researcher})).status,200);
 assert.equal((await call('/api/researcher/posthog/config',{method:'POST',cookie:researcher,body:{region:'eu',projectKey:token}})).status,200);assert.equal((await call('/api/researcher/posthog/export',{method:'POST',cookie:researcher,body:{studyId:'reflection-first',source:'simulation'}})).status,200);assert.equal(sends,1);
});
