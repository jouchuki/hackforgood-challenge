import {randomUUID,createHash} from 'node:crypto';
import {readFileSync,existsSync} from 'node:fs';
import {mkdir,writeFile,rename} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {exact,fail,text} from './validation.js';
import {makeReport} from './reports.js';
import {COUNTERS} from '../core/model.js';

export const LAB_METRICS=['shown','help_rate','completion_rate','retention_30s_rate','scroll_rate','message_end_rate'];
const REGIONS={eu:{ingest:'https://eu.i.posthog.com',app:'https://eu.posthog.com'},us:{ingest:'https://us.i.posthog.com',app:'https://us.posthog.com'}};
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const uuidFrom=hash=>`${hash.slice(0,8)}-${hash.slice(8,12)}-4${hash.slice(13,16)}-a${hash.slice(17,20)}-${hash.slice(20,32)}`;
const asyncRoute=fn=>(req,res,next)=>Promise.resolve(fn(req,res)).catch(next);

export function createPostHogBridge({filePath=resolve('.before/posthog.json'),fetcher=fetch,now=()=>new Date().toISOString()}={}){
 const load=()=>{if(!existsSync(filePath))return {region:'eu',projectId:'',projectKey:'',lastExport:null};return JSON.parse(readFileSync(filePath,'utf8'));};
 const persist=async value=>{await mkdir(dirname(filePath),{recursive:true,mode:0o700});const temp=filePath+'.'+randomUUID()+'.tmp';await writeFile(temp,JSON.stringify(value,null,2),{mode:0o600});await rename(temp,filePath);};
 const publicSettings=value=>({region:value.region,projectId:value.projectId||'',configured:Boolean(value.projectKey),lastExport:value.lastExport||null,mode:'aggregate_snapshots',browserTracking:false,posthogUrl:REGIONS[value.region]?.app||REGIONS.eu.app});
 async function save(body){
  exact(body,['region','projectId','projectKey'],['region']);if(!Object.hasOwn(REGIONS,body.region))fail('Choose the EU or US PostHog region.');
  if(body.projectId!==undefined&&body.projectId!==''&&!/^\d{1,12}$/.test(body.projectId))fail('Use the numeric PostHog project ID.');
  if(body.projectKey!==undefined&&body.projectKey!==''&&(typeof body.projectKey!=='string'||!/^phc_[A-Za-z0-9_-]{12,250}$/.test(body.projectKey)))fail('Enter a valid PostHog project token.');
  const previous=load();const value={...previous,region:body.region,projectId:body.projectId??previous.projectId,projectKey:body.projectKey||previous.projectKey};
  if(value.region!==previous.region||value.projectId!==previous.projectId||value.projectKey!==previous.projectKey){value.lastExport=null;value.exportHistory={};}
  await persist(value);return publicSettings(value);
 }
 async function send(settings,batch){
  let response;try{response=await fetcher(REGIONS[settings.region].ingest+'/batch/',{method:'POST',redirect:'error',headers:{'Content-Type':'application/json'},body:JSON.stringify({api_key:settings.projectKey,batch}),signal:AbortSignal.timeout(8000)});}catch{fail('PostHog could not be reached. Check the region and try again.',502,'posthog_unavailable');}
  if(!response.ok)fail('PostHog did not accept the export. Check the project token and region.',502,'posthog_rejected');
  let data;try{data=await response.json();}catch{fail('PostHog returned an unexpected response.',502,'posthog_rejected');}
  if(data.status!==1)fail('PostHog did not confirm the export. Check the project token.',502,'posthog_rejected');
 }
 async function exportReport(report,context){
  const settings=load();if(!settings.projectKey)fail('Connect a PostHog project first.',409,'posthog_not_configured');
  const rows=report.rows.filter(row=>Number.isInteger(row.counts?.shown)&&row.counts.shown>=report.threshold);
  if(!rows.length)fail('There are no reportable variant totals to export. Small groups remain hidden.',409,'no_reportable_data');
  const snapshot=rows.map(row=>({study_revision:row.studyRevision,arm_id:row.armId,counts:Object.fromEntries(COUNTERS.map(key=>[key,row.counts[key]??null])),rates:row.rates}));
  const exportId=digest({context,snapshot,region:settings.region,projectId:settings.projectId});
  const existing=settings.exportHistory?.[exportId]||(settings.lastExport?.exportId===exportId?settings.lastExport:null);
  if(existing){await persist({...settings,lastExport:existing});return {...existing,alreadyExported:true};}
  const at=now();const batch=snapshot.map(row=>({event:'next_step_aggregate_snapshot',uuid:uuidFrom(digest([exportId,row.study_revision,row.arm_id])),timestamp:at,properties:{distinct_id:'aggregate:'+digest([context,row.study_revision,row.arm_id]).slice(0,32),$process_person_profile:false,$geoip_disable:true,$ip:null,$insert_id:uuidFrom(digest([exportId,row.study_revision,row.arm_id])),export_id:exportId,study_id:context.studyId,study_revision:row.study_revision,arm_id:row.arm_id,data_source:report.source,period_from:context.from||'all',period_to:context.to||'all',...row.counts,...row.rates,measurement:'aggregate_snapshot',unit:'intervention_exposures'}}));
  await send(settings,batch);
  const result={exportId,eventCount:batch.length,at,alreadyExported:false,posthogUrl:settings.projectId?`${REGIONS[settings.region].app}/project/${settings.projectId}/insights`:REGIONS[settings.region].app};
  // Never overwrite a credential change that happened while an export was in flight.
  const latest=load();if(latest.projectKey===settings.projectKey&&latest.region===settings.region&&latest.projectId===settings.projectId)await persist({...latest,lastExport:result,exportHistory:{...(latest.exportHistory||{}),[exportId]:result}});
  return result;
 }
 return {read:()=>publicSettings(load()),save,exportReport};
}

export function mountResearchLab(app,{store,posthog=createPostHogBridge()}={}){
 const study=id=>{const value=store.read().studies[id];if(!value||value.owner!=='researcher')fail('The research study was not found.',404,'not_found');return value;};
 app.get('/api/researcher/lab',(_req,res)=>{const state=store.read();res.json({insights:state.insights||[],posthog:posthog.read(),metrics:LAB_METRICS});});
 app.post('/api/researcher/insights',asyncRoute(async(req,res)=>{
  exact(req.body,['name','studyId','metric','view','source','period','publication','from','to'],['name','studyId','metric','view','source']);const body=req.body;study(body.studyId);
  if(body.period!==undefined&&!['all','week','month'].includes(body.period))fail('Choose a supported reporting period.');
  if(!text(body.name,100)||!LAB_METRICS.includes(body.metric)||!['bars','table','journey'].includes(body.view)||!['all','simulation','demo_interaction'].includes(body.source))fail('Choose a name, metric and supported view.');
  if(body.publication!==undefined&&(typeof body.publication!=='string'||!study(body.studyId).publications.some(item=>item.key===body.publication)))fail('Select a published version.');
  makeReport(store.read(),{studyId:body.studyId,source:body.source,publication:body.publication,from:body.from,to:body.to});
  const insight={...body,id:'insight-'+randomUUID(),createdAt:new Date().toISOString()};await store.transact(state=>{state.insights||=[];if(state.insights.length>=30)fail('Keep up to 30 saved insight views.');state.insights.push(insight);});res.status(201).json(insight);
 }));
 app.delete('/api/researcher/insights/:id',asyncRoute(async(req,res)=>{await store.transact(state=>{if(!(state.insights||[]).some(item=>item.id===req.params.id))fail('The saved view was not found.',404);state.insights=state.insights.filter(item=>item.id!==req.params.id);});res.json({ok:true});}));
 app.post('/api/researcher/posthog/config',asyncRoute(async(req,res)=>res.json(await posthog.save(req.body))));
 app.post('/api/researcher/posthog/export',asyncRoute(async(req,res)=>{
  exact(req.body,['studyId','source','publication','from','to'],['studyId','source']);const body=req.body;study(body.studyId);
  if(body.publication!==undefined&&!study(body.studyId).publications.some(item=>item.key===body.publication))fail('Select a published version.');
  const report=makeReport(store.read(),{...body});res.json(await posthog.exportReport(report,body));
 }));
 return posthog;
}
