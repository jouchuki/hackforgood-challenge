import {test,expect} from '@playwright/test';
import {DEFAULT_INTERVENTION,COUNTERS} from '../core/model.js';
const BASE='http://localhost:3000';
const study={id:'qa-lab-fixture',name:'QA aggregate comparison',publications:[{key:'qa-lab-fixture@1',revision:1}]};
const row=(id,counts,rates)=>({armId:id,name:id==='A'?'Pause':'Direct support',studyRevision:'qa-lab-fixture@1',counts,rates});
const report={rows:[
 row('A',{shown:100,help_selected:20,reflection_viewed:90,education_viewed:60,support_viewed:40,path_measured:100,path_reflection_education:42,path_reflection_support:10,path_education_reflection:12,path_education_support:30,path_support_reflection:10,path_support_education:10},{help_rate:20,completion_rate:40,retention_30s_rate:35,scroll_rate:25,message_end_rate:40}),
 row('B',{shown:20,help_selected:null,reflection_viewed:18,education_viewed:10,support_viewed:null,path_measured:null,path_reflection_education:null,path_reflection_support:null,path_education_reflection:null,path_education_support:null,path_support_reflection:null,path_support_education:null},{help_rate:null,completion_rate:null,retention_30s_rate:null,scroll_rate:null,message_end_rate:null})
]};
async function mockedLab(page){
 const calls={posts:[],deletes:[],external:[],metrics:[]};let insights=[];let posthog={configured:false,region:'eu',projectId:'',lastExport:null};
 await page.route(url=>url.origin!==BASE&&!['data:','blob:'].includes(url.protocol),route=>{calls.external.push(route.request().url());return route.abort();});
 await page.route('**/api/researcher/**',async route=>{
  const req=route.request();const url=new URL(req.url());const path=url.pathname;const method=req.method();
  if(method==='GET'&&path==='/api/researcher/lab')return route.fulfill({json:{insights,posthog}});
  if(method==='GET'&&path==='/api/researcher/studies')return route.fulfill({json:[study]});
  if(method==='GET'&&path===`/api/researcher/studies/${study.id}/metrics`){calls.metrics.push(Object.fromEntries(url.searchParams));return route.fulfill({json:report});}
  if(method==='POST'){
   const body=req.postDataJSON();calls.posts.push({path,body});
   if(path==='/api/researcher/insights'){const item={id:'qa-insight-1',...body};insights.push(item);return route.fulfill({json:item});}
   if(path==='/api/researcher/posthog/config'){posthog={...posthog,configured:true,region:body.region,projectId:body.projectId};return route.fulfill({json:{configured:true}});}
   if(path==='/api/researcher/posthog/export'){posthog.lastExport={exportId:'qa-export-1',posthogUrl:'https://eu.posthog.com/project/123/events'};return route.fulfill({json:{alreadyExported:false,exportId:'qa-export-1'}});}
  }
  if(method==='DELETE'&&path==='/api/researcher/insights/qa-insight-1'){calls.deletes.push(path);insights=insights.filter(item=>item.id!=='qa-insight-1');return route.fulfill({json:{deleted:true}});}
  throw Error(`Unexpected Research Lab request: ${method} ${path}`);
 });
 await page.goto('/researcher/lab');await expect(page.locator('.lab-explorer')).toBeVisible();return calls;
}

test('research lab changes metrics and views, then saves, restores and deletes a custom view',async({page})=>{
 const calls=await mockedLab(page);await page.locator('[data-lab-select="metric"]').selectOption('retention_30s_rate');await expect(page.locator('.lab-chart-heading h2')).toContainText('30 seconds');
 await page.locator('[data-lab-select="view"]').selectOption('table');await expect(page.locator('.lab-explorer table')).toBeVisible();await expect(page.locator('.lab-explorer table')).toContainText('35%');
 await page.locator('[data-lab-save]').click();const dialog=page.getByRole('dialog');await dialog.locator('[name="name"]').fill('QA retention table');await dialog.locator('[type="submit"]').click();
 await expect(page.locator('[data-lab-insight="qa-insight-1"]')).toContainText('QA retention table');
 expect(calls.posts.find(item=>item.path==='/api/researcher/insights').body).toMatchObject({studyId:study.id,name:'QA retention table',metric:'retention_30s_rate',view:'table',source:'simulation'});
 await page.locator('[data-lab-select="metric"]').selectOption('help_rate');await page.locator('[data-lab-select="view"]').selectOption('bars');await page.locator('[data-lab-insight="qa-insight-1"]').click();
 await expect(page.locator('[data-lab-select="metric"]')).toHaveValue('retention_30s_rate');await expect(page.locator('[data-lab-select="view"]')).toHaveValue('table');
 await page.locator('[data-lab-delete="qa-insight-1"]').click();await expect(page.locator('[data-lab-insight="qa-insight-1"]')).toHaveCount(0);expect(calls.deletes).toHaveLength(1);expect(calls.external).toEqual([]);
});

test('research lab shows aggregate journey connections and preserves missing historical counters',async({page})=>{
 const calls=await mockedLab(page);await page.locator('[data-lab-select="view"]').selectOption('journey');await expect(page.locator('.lab-connections')).toBeVisible();
 await expect(page.locator('.lab-connections tbody tr').first()).toContainText('42');await expect(page.locator('.lab-journey-tools')).toContainText('100 measured exposures');
 await page.locator('[data-lab-select="armId"]').selectOption('B');await expect(page.locator('.lab-journey-tools')).toContainText('— measured exposures');
 const cells=await page.locator('.lab-connections tbody td').allTextContents();expect(cells.every(text=>text.trim()==='—')).toBe(true);await expect(page.locator('.lab-note').first()).toContainText('cannot reconstruct an individual journey');
 await page.locator('[data-lab-select="source"]').selectOption('demo_interaction');await expect.poll(()=>calls.metrics.at(-1)?.source).toBe('demo_interaction');expect(calls.posts).toEqual([]);expect(calls.external).toEqual([]);
});

test('research lab configures and exports an intercepted aggregate snapshot without a browser analytics SDK',async({page})=>{
 const calls=await mockedLab(page);await expect(page.locator('[data-lab-export]')).toBeDisabled();await expect(page.locator('.lab-posthog')).toContainText('Not connected');
 await page.locator('.lab-posthog-config summary').click();const form=page.locator('[data-lab-posthog-form]');await form.locator('[name="projectId"]').fill('123');await form.locator('[name="projectKey"]').fill('phc_QA_FAKE_NEVER_SENT');await form.locator('[type="submit"]').click();
 await expect(page.locator('[data-lab-export]')).toBeEnabled();await expect(page.locator('.lab-posthog')).toContainText('Project configured');await expect(page.locator('[name="projectKey"]')).toHaveValue('');
 await page.locator('[data-lab-export]').click();await expect(page.locator('.lab-posthog')).toContainText('Export verified');
 const exported=calls.posts.find(item=>item.path==='/api/researcher/posthog/export');expect(exported.body).toEqual({studyId:study.id,source:'simulation'});
 await expect(page.locator('.lab-posthog a[href="https://eu.posthog.com/project/123/events"]')).toBeVisible();expect(calls.external).toEqual([]);
 expect(await page.locator('script[src*="posthog"],script[src*="clarity"],iframe[src*="posthog"]').count()).toBe(0);
});

test('delivered journey counts each aggregate stage connection once without transmitting a visitor history',async({page})=>{
 const payloads=[];const intervention=structuredClone(DEFAULT_INTERVENTION);intervention.order=['reflection','education','support'];intervention.layout='reading';intervention.motion={enabled:false,transition:'none',holdSeconds:5};
 await page.route('**/api/public/sites/demo-fieldnotes/*',async route=>{
  const request=route.request(),path=new URL(request.url()).pathname;
  if(path.endsWith('/config')&&request.method()==='GET')return route.fulfill({json:{country:'NL',studyRevision:'qa-paths@1',reportingDay:'2026-11-08',services:[],legalPack:null,arms:[{id:'A',name:'QA path fixture',weight:100,intervention}]}});
  if(path.endsWith('/metrics')&&request.method()==='POST'){payloads.push(request.postDataJSON());return route.fulfill({json:{accepted:true}});}
  throw Error(`Unexpected visitor fixture request: ${request.method()} ${path}`);
 });
 await page.goto('/intervention/demo-fieldnotes?lang=en&country=NL');await expect(page.locator('[data-before-stage]')).toHaveAttribute('data-before-stage','reflection');
 for(const [index,stage]of [[1,'education'],[2,'support'],[0,'reflection'],[1,'education']]){await page.locator(`[data-stage="${index}"]`).first().click();await expect(page.locator('[data-before-stage]')).toHaveAttribute('data-before-stage',stage);}
 const sum=key=>payloads.reduce((total,item)=>total+(item.counts[key]||0),0);
 await expect.poll(()=>sum('path_education_support')).toBe(1);expect(sum('path_reflection_education')).toBe(1);expect(sum('path_support_reflection')).toBe(1);expect(sum('path_measured')).toBe(1);
 for(const payload of payloads){expect(Object.keys(payload).sort()).toEqual(['armId','counts','reportingDay','schemaVersion','source','studyRevision']);expect(payload).toMatchObject({schemaVersion:1,armId:'A',studyRevision:'qa-paths@1',source:'demo_interaction'});for(const[key,value]of Object.entries(payload.counts)){expect(COUNTERS).toContain(key);expect(Number.isInteger(value)&&value>0).toBe(true);}expect(JSON.stringify(payload)).not.toMatch(/sessionId|userId|originalText|scrollTop|coordinates/);}
});
