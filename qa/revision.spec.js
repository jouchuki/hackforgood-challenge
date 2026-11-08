import {test,expect,request as requestFactory} from '@playwright/test';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
const BASE='http://localhost:3000';const SITE='demo-fieldnotes';const label=`QA study ${Date.now()}`;
let originalSite,studyId,publication,authoredStudy;const extraStudies=[];
test.describe.configure({mode:'serial'});
const session=(request,role)=>request.post('/api/session',{data:{role}});
const step=(page,value)=>page.locator(`.wk-composer-steps [data-composer-step="${value}"]`).click();
async function ready(page){await expect(page.locator('#main')).not.toHaveAttribute('aria-busy','true');}
async function openResearchTemplates(page){const library=page.locator('details.mb-research-templates');if(await library.count()&&!await library.evaluate(element=>element.open))await library.locator('summary').first().click();}
test.beforeAll(async({request})=>{await session(request,'moderator');originalSite=await(await request.get(`/api/moderator/sites/${SITE}`)).json();});
test.afterAll(async({request})=>{
 const ownedIds=[studyId,...extraStudies].filter(Boolean);
 if(ownedIds.length){await session(request,'researcher');let prior=[];try{prior=JSON.parse(await readFile('.before/qa/revision-created-studies.json','utf8'));}catch{}for(const id of ownedIds){const r=await request.get(`/api/researcher/studies/${id}`);if(r.ok()){const study=await r.json();const entry={id,name:study.name,publications:(study.publications||[]).map(p=>p.key)};prior=[...prior.filter(item=>item.id!==id),entry];}}await mkdir('.before/qa',{recursive:true});await writeFile('.before/qa/revision-created-studies.json',JSON.stringify(prior,null,2));}
 if(!ownedIds.length||!originalSite)return;
 await session(request,'moderator');const current=await(await request.get(`/api/moderator/sites/${SITE}`)).json();
 if(ownedIds.some(id=>current.enrolment?.studyRevision?.startsWith(id+'@')))await request.put(`/api/moderator/sites/${SITE}/enrolment`,{data:originalSite.enrolment||{studyRevision:current.enrolment.studyRevision,enabled:false}});
});

test('moderator screens contain operational controls without research, metrics or report requests',async({page})=>{
 const forbidden=[];page.on('request',request=>{const u=new URL(request.url());if(u.pathname.startsWith('/api/moderator/')&&/\/(metrics|export|simulate|studies)(\/|$)/.test(u.pathname))forbidden.push(u.pathname);});
 for(const path of ['/moderator/overview','/moderator/intervention','/moderator/integrations','/moderator/content']){
  await page.goto(path);await ready(page);
  await expect(page.locator('a[href^="/moderator/analytics"],a[href^="/moderator/research"],a[href^="/researcher/"]')).toHaveCount(0);
  await expect(page.locator('.metrics-grid,.wk-study-summary,.wk-comparison,[data-testid="research-engagement"],[data-testid="engagement-results"]')).toHaveCount(0);
 }
 for(const path of ['/moderator/analytics','/moderator/research']){await page.goto(path);await expect(page).toHaveURL(/\/moderator\/overview(?:[?#]|$)/);}
 expect(forbidden).toEqual([]);
 const isolated=await requestFactory.newContext({baseURL:BASE});await session(isolated,'moderator');
 for(const suffix of ['metrics','export'])expect((await isolated.get(`/api/moderator/sites/${SITE}/${suffix}`)).status()).toBe(404);
 expect((await isolated.post(`/api/moderator/sites/${SITE}/simulate`,{data:{volume:20,seed:1}})).status()).toBe(404);
 expect((await isolated.get('/api/researcher/studies/reflection-first/metrics')).status()).toBe(403);await isolated.dispose();
});

test('study editing has no traffic controls and saves automatic even variant splits',async({page})=>{
 await page.goto('/researcher/studies');await page.getByTestId('new-study').click();const dialog=page.getByRole('dialog');
 await dialog.locator('[name="studyPreset"]').selectOption('tone');
 await dialog.locator('[name="name"]').fill(label);await dialog.locator('[name="hypothesis"]').fill('Synthetic QA: compare explicit approaches with automatic assignment.');
 await dialog.locator('[type="submit"]').click();await expect(page).toHaveURL(/\/researcher\/studies\/[^/]+\/editor/);studyId=new URL(page.url()).pathname.split('/')[3];
 const initialStudy=await(await page.request.get(`/api/researcher/studies/${studyId}`)).json();
 expect(initialStudy.arms).toHaveLength(2);expect(initialStudy.arms[0].intervention.en).not.toEqual(initialStudy.arms[1].intervention.en);
 await step(page,'setup');await expect(page.locator('[data-allocation-preset],[data-weight-slider],[data-weight-index],.wk-allocation-panel,#weight-summary')).toHaveCount(0);
 await step(page,'messages');await page.locator('[data-action="add-arm"]').click();await expect(page.locator('[data-arm]')).toHaveCount(3);
 await page.locator('[data-action="save-study"]').click();await expect(page.locator('#action-status')).toContainText(/saved/i);
 let stored=await(await page.request.get(`/api/researcher/studies/${studyId}`)).json();expect(stored.arms.map(a=>a.weight)).toEqual([34,33,33]);
 await page.locator('[data-arm="2"]').click();await page.locator('[data-action="remove-arm"]').click();await expect(page.locator('[data-arm]')).toHaveCount(2);
 await page.locator('[data-action="save-study"]').click();await expect(page.locator('#action-status')).toContainText(/saved/i);
 stored=await(await page.request.get(`/api/researcher/studies/${studyId}`)).json();expect(stored.arms.map(a=>a.weight)).toEqual([50,50]);
 await page.locator('[data-arm="0"]').click();
 const before=await page.locator('#shared-preview [data-before-headline]').innerText();
 await openResearchTemplates(page);const presets=page.locator('details.wk-message-presets');if(!await presets.evaluate(element=>element.open))await presets.locator('summary').click();
 await page.locator('[data-message-preset="consequences"]').click();
 await expect(page.locator('[name="copy:educationTitle"]')).toBeVisible();
 const actualTitle=await page.locator('[name="copy:educationTitle"]').inputValue();
 expect(actualTitle).not.toBe(before);await expect(page.locator('#shared-preview [data-before-headline]')).toHaveText(actualTitle);
 await step(page,'review');await expect(page.locator('[data-allocation-preset],[data-weight-slider],[data-weight-index],.wk-allocation-panel,#weight-summary')).toHaveCount(0);await expect(page.locator('.wk-review-variants')).not.toContainText(/\d+%/);await page.getByTestId('publish-study').click();await expect(page.locator('#action-status')).toContainText(/published/i);
 authoredStudy=await(await page.request.get(`/api/researcher/studies/${studyId}`)).json();publication=authoredStudy.publications.at(-1).key;
 expect(authoredStudy.publications.at(-1).arms.map(a=>a.weight)).toEqual([50,50]);
 expect(authoredStudy.publications.at(-1).arms[0].intervention.order[0]).toBe('education');
 await mkdir('artifacts/ui-revision/after',{recursive:true});await page.screenshot({path:'artifacts/ui-revision/after/study-published-proof.png',fullPage:true});
});

test('researcher explicitly approves a platform before evenly assigned variants reach real visitor renders',async({page,browser})=>{
 await page.goto(`/researcher/studies/${studyId}/platforms`);await ready(page);
 const before=await(await page.request.get(`/api/public/sites/${SITE}/config?country=NL&lang=en`)).json();expect(before.studyRevision).not.toBe(publication);
 await page.locator(`[data-action="review-platform-enrol"][data-site-id="${SITE}"]`).click();
 const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();
 expect((await(await page.request.get(`/api/public/sites/${SITE}/config?country=NL&lang=en`)).json()).studyRevision).not.toBe(publication);
 const acknowledgement=dialog.locator('[name="ownerApproval"]');if(await acknowledgement.count())await acknowledgement.check();
 await dialog.getByTestId('enrol-study').click();
 await expect.poll(async()=> (await(await page.request.get(`/api/public/sites/${SITE}/config?country=NL&lang=en`)).json()).studyRevision).toBe(publication);
 const active=await(await page.request.get(`/api/public/sites/${SITE}/config?country=NL&lang=en`)).json();expect(active.arms.map(a=>a.weight)).toEqual([50,50]);
 for(const[random,index]of[[0.1,0],[0.9,1]]){const context=await browser.newContext({baseURL:BASE,locale:'en-US'});await context.addInitScript(n=>Math.random=()=>n,random);const visitor=await context.newPage();await visitor.goto(`/intervention/${SITE}?preview=1&lang=en&country=NL`);const arm=authoredStudy.publications.at(-1).arms[index].intervention;const title=arm.order[0]==='education'?arm.en.educationTitle:arm.en.title;await expect(visitor.getByRole('heading',{level:1})).toHaveText(title);await context.close();}
 await page.goto('/researcher/studies/reflection-first/results');await expect(page.getByTestId('engagement-results')).toBeVisible();
 for(const text of ['Visible ≥30s','Scrolled in information step','Message end reached'])await expect(page.getByTestId('engagement-results')).toContainText(text);
 await expect(page.locator('[data-action="export"]')).toBeVisible();
});

test('independent community chrome keeps ordinary searches local and completes the real SDK diagnostic',async({page,browser})=>{
 await page.goto('/demo/forum');await expect(page.locator('#demo-search button[type="submit"]')).toBeEnabled();
 await expect(page.locator('.sidebar,.workspace-main,.brand')).toHaveCount(0);
 await expect(page.locator('a[href*="/moderator/"],a[href*="/researcher/"]')).toHaveCount(0);
 expect(await page.title()).toContain('MySmall20kUserForum');expect(await page.title()).not.toMatch(/Next Step|NextStep|Before/);
 await page.locator('#demo-query').fill('walking');await page.locator('#demo-search').evaluate(form=>form.requestSubmit());await expect(page).toHaveURL(/\/demo\/forum\/?$/);
 await expect(page.locator('#community-threads .cg-thread')).toHaveCount(1);
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await expect(page.locator('#demo-query')).toBeVisible();await page.setViewportSize({width:1440,height:1000});
 await page.goto('/moderator/integrations');const started=page.waitForResponse(r=>r.request().method()==='POST'&&r.url().endsWith('/api/moderator/sites/demo-forum/deployment'));await page.locator('[data-action="check-deployment"]').click();const check=await(await started).json();expect(check.verification.status).toBe('checking');
 const ctx=await browser.newContext({baseURL:BASE});const community=await ctx.newPage();let metrics=0;community.on('request',r=>{if(r.method()==='POST'&&r.url().endsWith('/metrics'))metrics++;});await community.goto(check.testUrl);await expect(community.locator('#demo-search button[type="submit"]')).toBeEnabled();await community.locator('#demo-query').fill('test-trigger-red');await community.locator('#demo-search').evaluate(form=>form.requestSubmit());await expect(community).toHaveURL(/\/intervention\/demo-forum\?.*before_check=/);expect(community.url()).not.toContain('test-trigger-red');
 await expect.poll(async()=> (await(await page.request.get('/api/moderator/sites/demo-forum/deployment')).json()).verification.status).toBe('verified');expect(metrics).toBe(0);await ctx.close();
});


test('experience presets render three different journeys and publish a real three-arm comparison',async({page,browser})=>{
 await page.goto('/researcher/studies');await page.getByTestId('new-study').click();const dialog=page.getByRole('dialog');await dialog.locator('[name="studyPreset"]').selectOption('experiences');
 await dialog.locator('[name="name"]').fill(`QA study ${Date.now()}`);await dialog.locator('[name="hypothesis"]').fill('Synthetic QA: compare plain, calm and meaning experiences.');await dialog.locator('[type="submit"]').click();await expect(page).toHaveURL(/\/researcher\/studies\/[^/]+\/editor/);const id=new URL(page.url()).pathname.split('/')[3];extraStudies.push(id);
 const created=await(await page.request.get(`/api/researcher/studies/${id}`)).json();expect(created.arms).toHaveLength(3);expect(created.arms.map(a=>a.weight)).toEqual([34,33,33]);expect(created.arms.map(a=>a.intervention.layout)).toEqual(['plain','reading','meaning']);
 for(const language of ['en','nl']){
  const calm=created.arms[1].intervention[language],meaning=created.arms[2].intervention[language];const calmText=[calm.title,calm.body,calm.button].join(' ');const meaningText=[meaning.title,meaning.body].join(' ');
  expect(calmText).not.toMatch(language==='en'?/future|relationships|\blife\b|meaning|purpose|values/i:/toekomst|relaties|\bleven\b|betekenis|waarden/i);
  expect(calmText).toMatch(language==='en'?/pause|stop|breath|slow|screen|feet|ground|reset|moment/i:/pauze|stop|adem|rust|scherm|voeten|grond|moment/i);
  expect(meaningText).toMatch(language==='en'?/\btime\b|\blife\b|hours|years|future|direction/i:/\btijd\b|\bleven\b|uren|jaren|toekomst|richting/i);expect(meaningText).toContain('?');
 }

 await step(page,'messages');await page.locator('[data-arm="0"]').click();let metricPosts=0;page.on('request',r=>{if(r.method()==='POST'&&r.url().endsWith('/metrics'))metricPosts++;});const headlines=[];
 for(const experience of ['plain','calm','meaning']){
  await openResearchTemplates(page);
  await page.locator(`[data-experience-preset="${experience}"]`).click();
  const preview=page.locator(`#shared-preview[data-before-experience="${experience}"], #shared-preview [data-before-experience="${experience}"]`).first();await expect(preview).toBeVisible();headlines.push(await preview.locator('[data-before-headline]').first().innerText());
  if(experience==='plain'){await expect(preview.locator('.before-progress')).toHaveCount(0);await expect(preview.locator('[data-before-support]')).toBeVisible();await expect(preview.locator('.before-service-card').first()).toBeVisible();await expect(preview).toContainText(/Legal information|law|illegal/i);await expect(preview.locator('[data-enforcement-notice]')).toBeVisible();const nlServices=await preview.locator('.before-service-card strong').allTextContents();await preview.locator('[data-country]').selectOption('UNKNOWN');await expect(preview.locator('[data-enforcement-notice]')).toHaveCount(0);await expect(preview).not.toContainText(/article\s*(252|254)|maximum sentence/i);for(const name of nlServices)await expect(preview).not.toContainText(name);await preview.locator('[data-country]').selectOption('NL');for(const name of nlServices)await expect(preview).toContainText(name);}
  if(experience==='meaning'){await expect(preview.locator('.before-meaning-motif')).toBeVisible();await expect(preview.locator('.landscape')).toHaveCount(0);}
  await mkdir('artifacts/ui-revision/after',{recursive:true});await preview.screenshot({path:`artifacts/ui-revision/after/experience-${experience}.png`,animations:'disabled'});
 }
 expect(new Set(headlines).size).toBe(3);expect(metricPosts).toBe(0);
 await openResearchTemplates(page);await page.locator('[data-experience-preset="plain"]').click();await step(page,'review');await page.getByTestId('publish-study').click();await expect(page.locator('#action-status')).toContainText(/published/i);
 const published=await(await page.request.get(`/api/researcher/studies/${id}`)).json();const current=published.publications.at(-1);expect(current.arms.map(a=>a.weight)).toEqual([34,33,33]);expect(current.arms.map(a=>a.intervention.layout)).toEqual(['plain','reading','meaning']);
 const enabled=await page.request.put(`/api/researcher/studies/${id}/platforms/${SITE}`,{data:{studyRevision:current.key,enabled:true,confirmReplacement:true}});expect(enabled.ok()).toBeTruthy();
 for(const [experience,random]of [['plain',0.1],['calm',0.5],['meaning',0.9]]){for(const mobile of [false,true]){const capture=await browser.newContext({baseURL:BASE,locale:'en-US',viewport:mobile?{width:390,height:844}:{width:1440,height:1000},reducedMotion:'reduce'});await capture.addInitScript(n=>Math.random=()=>n,random);const delivered=await capture.newPage();let previewMetrics=0;capture.on('request',request=>{if(request.method()==='POST'&&request.url().endsWith('/metrics'))previewMetrics++;});await delivered.goto(`/intervention/${SITE}?preview=1&lang=en&country=NL`);await expect(delivered.locator(`[data-before-experience="${experience}"]`)).toBeVisible();expect(await delivered.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await delivered.evaluate(()=>document.fonts.ready);await delivered.screenshot({path:`artifacts/ui-revision/after/experience-${experience}${mobile?'-mobile':''}.png`,fullPage:true,animations:'disabled'});await capture.close();expect(previewMetrics).toBe(0);}}

 const ctx=await browser.newContext({baseURL:BASE,locale:'en-US'});await ctx.addInitScript(()=>Math.random=()=>0.1);const visitor=await ctx.newPage();await visitor.goto(`/intervention/${SITE}?preview=1&lang=en&country=UNKNOWN`);
 const outside=await(await visitor.request.get(`/api/public/sites/${SITE}/config?lang=en&country=UNKNOWN`)).json();expect(outside.studyRevision).not.toBe(current.key);expect(outside.legalPack).toBeNull();await expect(visitor.locator('[data-before-stage]')).toBeVisible();await expect(visitor.locator('[data-enforcement-notice]')).toHaveCount(0);await expect(visitor.locator('#journey')).not.toContainText(/article\s*(252|254)|maximum sentence/i);await ctx.close();expect(metricPosts).toBe(0);
 const measured=await browser.newContext({baseURL:BASE,locale:'en-US',viewport:{width:390,height:844}});await measured.addInitScript(()=>Math.random=()=>0.1);await measured.route('https://**/*',route=>route.abort());const actual=await measured.newPage();const payloads=[];actual.on('request',request=>{if(request.method()==='POST'&&request.url().endsWith(`/api/public/sites/${SITE}/metrics`))payloads.push(request.postDataJSON());});const count=key=>payloads.reduce((sum,payload)=>sum+(payload.counts[key]||0),0);
 await actual.goto(`/intervention/${SITE}?lang=en&country=NL`);await expect(actual.locator('[data-before-experience="plain"]')).toBeVisible();await expect.poll(()=>count('education_viewed')).toBe(1);await expect.poll(()=>count('engagement_measured')).toBe(1);await actual.locator('[data-before-support]').scrollIntoViewIfNeeded();await expect.poll(()=>count('support_viewed')).toBe(1);
 const accepted=actual.waitForResponse(response=>response.request().method()==='POST'&&response.url().endsWith(`/api/public/sites/${SITE}/metrics`)&&response.request().postDataJSON().counts.help_selected===1);await actual.locator('[data-help]').first().click();expect((await accepted).ok()).toBe(true);await expect.poll(()=>count('help_selected')).toBe(1);expect(count('support_viewed')).toBe(1);expect(count('reflection_viewed')).toBe(0);await measured.close();
});
