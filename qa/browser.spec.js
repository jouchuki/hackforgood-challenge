import { test, expect, request as requestFactory } from '@playwright/test';
import { mkdir, readFile, appendFile,writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const BASE = 'http://localhost:3000';
const SITE = 'demo-fieldnotes';
const SCREENSHOTS = resolve('.before/qa');
const runLabel = `QA study ${Date.now()}`;
let originalSite;
let studyId;
let studyPublication;
let mutatedSite = false;

test.describe.configure({ mode: 'serial' });

async function session(request, role) {
  const response = await request.post(`${BASE}/api/session`, { data: { role } });
  expect(response.ok()).toBeTruthy();
}

async function openModerator(page, route) {
  await page.goto(`/moderator/${route}`);
  await expect(page.locator('#site-selector')).toBeVisible();
  await page.locator('#site-selector').selectOption(SITE);
  await expect(page.locator('#site-selector')).toHaveValue(SITE);
  await expect(page.locator('#main')).not.toHaveAttribute('aria-busy', 'true');
}

async function screenshot(page, name) {
  await mkdir(SCREENSHOTS, { recursive: true });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: resolve(SCREENSHOTS, `${name}.png`), fullPage: true, animations: 'disabled' });
}

async function openAdvanced(page) {
  const details = page.locator('#advanced-settings');
  if (await details.count() && !await details.evaluate(element => element.open)) {
    await details.locator('summary').click();
  }
}

async function composerStep(page, step) {
  const button = page.locator(`.wk-composer-steps [data-composer-step="${step}"]`);
  if (await button.count()) await button.click();
}

async function openAuthoredArm(browser, random, title) {
  const context = await browser.newContext({ baseURL: BASE, locale: 'en-US', viewport: { width: 1440, height: 1000 } });
  await context.addInitScript(value => { Math.random = () => value; }, random);
  const page = await context.newPage();
  const payloads = [];
  page.on('request', request => {
    if (request.method() === 'POST' && request.url().endsWith(`/api/public/sites/${SITE}/metrics`)) payloads.push(request.postDataJSON());
  });
  await page.goto(`/intervention/${SITE}?lang=en&country=NL`);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
  await expect(page.locator('[data-before-stage]')).toHaveAttribute('data-before-stage', 'reflection');
  await expect.poll(() => payloads.length).toBeGreaterThan(0);
  return { context, page, payloads };
}

test.beforeAll(async ({ request }) => {
  await session(request, 'moderator');
  const response = await request.get(`${BASE}/api/moderator/sites/${SITE}`);
  expect(response.ok()).toBeTruthy();
  originalSite = await response.json();
});

test.afterAll(async ({ request }) => {
  if (!originalSite || !mutatedSite) return;
  await session(request, 'moderator');
  await request.post(`${BASE}/api/moderator/sites/${SITE}/revert`, { data: { publicationKey: originalSite.activePublication } });
  await request.put(`${BASE}/api/moderator/sites/${SITE}/draft`, { data: originalSite.draft });
  const current = await (await request.get(`${BASE}/api/moderator/sites/${SITE}`)).json();
  if (current.enrolment) await request.put(`${BASE}/api/moderator/sites/${SITE}/enrolment`, {
    data: originalSite.enrolment || { studyRevision: current.enrolment.studyRevision, enabled: false },
  });
});

test('moderator and researcher have distinct routes, navigation and role APIs', async ({ page, request }) => {
  await page.goto('/moderator/overview');
  await expect(page.locator('#site-selector')).toBeVisible();
  await expect(page.locator('.sidebar nav a').first()).toBeVisible();
  await expect(page.locator('.sidebar nav a[href^="/researcher/"]')).toHaveCount(0);
  await screenshot(page, 'moderator-overview');
  await page.goto('/researcher/studies');
  await expect(page.locator('.sidebar nav a[href^="/moderator/"]')).toHaveCount(0);
  await expect(page.getByTestId('new-study')).toBeVisible();
  await screenshot(page, 'researcher-studies');
  const isolated = await requestFactory.newContext();
  await session(isolated, 'researcher');
  expect((await isolated.get(`${BASE}/api/moderator/sites`)).status()).toBe(403);
  await isolated.dispose();
});

test('moderator publishes exact bilingual copy and a visitor receives the publication', async ({ page, browser }) => {
  mutatedSite = true;
  await openModerator(page, 'intervention');
  await page.locator('[name="copy:title"]').fill('QA: A deliberate next step.');
  await expect(page.locator('#shared-preview [data-before-headline]')).toHaveText('QA: A deliberate next step.');
  await page.locator('[data-edit-language="nl"]').click();
  await page.locator('[name="copy:title"]').fill('QA: Een bewuste volgende stap.');
  await page.locator('[data-action="review-default"]').click();
  const publishing=page.waitForResponse(response=>response.request().method()==='POST'&&response.url().endsWith(`/api/moderator/sites/${SITE}/publish`));
  await page.getByTestId('publish-intervention').click();
  const published=await(await publishing).json();let ownedPublications=[];try{ownedPublications=JSON.parse(await readFile('.before/qa/builder-created-publications.json','utf8'));}catch{}ownedPublications.push({siteId:SITE,publicationKey:published.activePublication,name:published.intervention.name,previousPublication:originalSite.activePublication,qaHeadline:'QA: A deliberate next step.'});await mkdir('.before/qa',{recursive:true});await writeFile('.before/qa/builder-created-publications.json',JSON.stringify(ownedPublications,null,2));
  await expect(page.locator('#action-status')).toContainText(/Published|Gepubliceerd/i);
  await screenshot(page, 'moderator-editor');

  const context = await browser.newContext({ baseURL: BASE, locale: 'en-US' });
  const visitor = await context.newPage();
  let previewMetrics = 0;
  context.on('request', request => { if (request.method() === 'POST' && request.url().includes('/metrics')) previewMetrics += 1; });
  await visitor.goto(`/intervention/${SITE}?lang=en&country=NL&preview=1`);
  await expect(visitor.getByRole('heading', { level: 1 })).toHaveText('QA: A deliberate next step.');
  await visitor.locator('[data-language="nl"]').click();
  await expect(visitor.getByRole('heading', { level: 1 })).toHaveText('QA: Een bewuste volgende stap.');
  await expect(visitor.locator('html')).toHaveAttribute('lang', 'nl');
  await expect(visitor.locator('.sidebar')).toHaveCount(0);
  await screenshot(visitor, 'visitor-dutch');
  await visitor.locator('[data-stage="1"]').first().click();
  await expect(visitor.locator('[data-before-stage]')).toHaveAttribute('data-before-stage','education');
  await visitor.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));
  await visitor.waitForTimeout(200);
  expect(previewMetrics).toBe(0);
  expect((await context.cookies()).some(cookie => cookie.name.startsWith('before_'))).toBe(false);
  await context.close();
});

test('researcher authored A/B messages publish, require opt-in, and reach the real renderer', async ({ page, browser }) => {
  test.setTimeout(120000);
  await page.goto('/researcher/studies');
  await page.getByTestId('new-study').click();
  const dialog = page.getByRole('dialog');
  await dialog.locator('[name="name"]').fill(runLabel);
  await dialog.locator('[name="hypothesis"]').fill('Synthetic QA hypothesis: compare two explicitly authored journeys.');
  await dialog.locator('[type="submit"]').click();
  await expect(page).toHaveURL(/\/researcher\/studies\/[^/]+\/editor/);
  studyId = new URL(page.url()).pathname.split('/')[3];
  await mkdir('.before/qa',{recursive:true});
  await appendFile('.before/qa/clarity-created-studies.jsonl',JSON.stringify({id:studyId,name:runLabel})+'\n');
  await composerStep(page, 'messages');
  await expect(page.locator('#arm-editor')).toBeVisible();

  await openAdvanced(page);
  await page.locator('[name="option:order"]').selectOption('0');
  const reflectionA = page.locator('[data-edit-stage="reflection"]');
  if (await reflectionA.count()) await reflectionA.click();
  await page.locator('[name="copy:title"]').fill('QA arm A: choose a safer next step.');
  await page.locator('[data-arm="1"]').click();
  await openAdvanced(page);
  await page.locator('[name="option:order"]').selectOption('0');
  const reflectionB = page.locator('[data-edit-stage="reflection"]');
  if (await reflectionB.count()) await reflectionB.click();
  await page.locator('[name="copy:title"]').fill('QA arm B: make room for support.');
  await openAdvanced(page);
  await page.locator('[name="motion:enabled"]').check();
  await page.locator('[name="motion:holdSeconds"]').fill('2');
  await composerStep(page, 'review');
  await page.getByTestId('publish-study').click();
  await expect(page.locator('#action-status')).toContainText(/Published|Gepubliceerd/i);
  const study = await (await page.request.get(`/api/researcher/studies/${studyId}`)).json();
  studyPublication = study.publications.at(-1).key;
  expect(study.publications.at(-1).arms.map(arm => arm.intervention.en.title)).toEqual([
    'QA arm A: choose a safer next step.', 'QA arm B: make room for support.',
  ]);
  await screenshot(page, 'researcher-composer');

  const before = await (await page.request.get(`/api/public/sites/${SITE}/config?country=NL&lang=en`)).json();
  expect(before.studyRevision).not.toBe(studyPublication);
  mutatedSite = true;
  // The self-hosted demo operator explicitly authorises this installation in research.
  // Publication alone must never enrol a platform.
  const participation = await page.request.put(`/api/researcher/studies/${studyId}/platforms/${SITE}`, {
    data: { studyRevision: studyPublication, enabled: true, confirmReplacement: true },
  });
  expect(participation.ok()).toBeTruthy();
  const active = await (await page.request.get(`/api/public/sites/${SITE}/config?country=NL&lang=en`)).json();
  expect(active.studyRevision).toBe(studyPublication);

  const a = await openAuthoredArm(browser, 0.1, 'QA arm A: choose a safer next step.');
  await a.page.locator('[data-support]').first().click();
  await expect(a.page.locator('[data-before-stage]')).toHaveAttribute('data-before-stage', 'support');
  await a.context.route('https://**/*', route => route.abort());
  const acceptedHelp = a.page.waitForResponse(response => {
    if (response.request().method() !== 'POST' || !response.url().endsWith(`/api/public/sites/${SITE}/metrics`)) return false;
    return response.request().postDataJSON()?.counts?.help_selected === 1;
  });
  await a.page.locator('[data-help]').first().click();
  expect((await acceptedHelp).ok()).toBeTruthy();
  await expect.poll(() => a.payloads.some(payload => payload.counts.help_selected === 1)).toBe(true);
  for (const payload of a.payloads) {
    expect(Object.keys(payload).sort()).toEqual(['armId', 'counts', 'reportingDay', 'schemaVersion', 'source', 'studyRevision']);
    expect(payload.studyRevision).toBe(studyPublication);
    expect(payload.source).toBe('demo_interaction');
    expect(JSON.stringify(payload)).not.toMatch(/session|userAgent|query|ipAddress|fingerprint|durationMs/i);
  }
  await a.context.close();

  const b = await openAuthoredArm(browser, 0.9, 'QA arm B: make room for support.');
  await expect(b.page.locator('[data-play]')).toBeVisible();
  await b.page.locator('[data-play]').click();
  await expect(b.page.locator('[data-play]')).toContainText('Pause');
  await b.page.locator('[data-play]').click();
  await expect(b.page.locator('[data-play]')).toContainText('Play');
  await screenshot(b.page, 'visitor-motion');
  await b.context.close();
});

test('education engagement counts visible content and trusted scrolling once without granular telemetry', async ({ browser }) => {
  const runs=[{mobile:true,random:0.1,viewport:{width:390,height:844}},{mobile:false,random:0.9,viewport:{width:1440,height:1600}}];
  for(const run of runs){
    const context=await browser.newContext({baseURL:BASE,locale:'en-US',viewport:run.viewport,reducedMotion:'reduce'});
    await context.addInitScript(value=>{Math.random=()=>value;},run.random);
    if(run.mobile)await context.route(`**/api/public/sites/${SITE}/config*`,async route=>{
      const response=await route.fetch();const config=await response.json();
      for(const arm of config.arms)arm.intervention.en.educationBody=Array(12).fill('You can pause, consider the harm, and choose a next step towards support. Help remains available at any time.').join(' ');
      await route.fulfill({response,json:config});
    });
    const page=await context.newPage();const payloads=[];const receipts=[];
    page.on('request',request=>{if(request.method()==='POST'&&request.url().endsWith(`/api/public/sites/${SITE}/metrics`))payloads.push(request.postDataJSON());});
    page.on('response',response=>{if(response.request().method()==='POST'&&response.url().endsWith(`/api/public/sites/${SITE}/metrics`))receipts.push(response.status());});
    const count=key=>payloads.reduce((sum,payload)=>sum+(payload.counts[key]||0),0);
    await page.goto(`/intervention/${SITE}?lang=en&country=NL`);
    await page.locator('[data-stage="1"]').first().click();
    await expect(page.locator('[data-before-stage]')).toHaveAttribute('data-before-stage','education');
    await expect.poll(()=>count('engagement_measured')).toBe(1);
    if(run.mobile){
      const marker=page.locator('[data-before-content-end="education"]');
      expect((await marker.boundingBox()).y).toBeGreaterThan(run.viewport.height);
      expect(count('education_end_viewed')).toBe(0);
      // A programmatic scroll is deliberately not treated as visitor intent.
      await page.evaluate(()=>window.scrollTo(0,25));await page.waitForTimeout(100);
      expect(count('scrolled')).toBe(0);
      await page.mouse.move(180,400);await page.mouse.wheel(0,5000);
      await expect.poll(()=>count('scrolled')).toBe(1);
    }else{
      await expect.poll(()=>count('education_end_viewed')).toBe(1);
      expect(count('scrolled')).toBe(0);
    }
    await expect.poll(()=>count('education_end_viewed')).toBe(1);
    await page.locator('[data-stage="0"]').first().click();await page.locator('[data-stage="1"]').first().click();
    await page.waitForTimeout(150);
    expect(count('engagement_measured')).toBe(1);expect(count('education_end_viewed')).toBe(1);expect(count('scrolled')).toBe(run.mobile?1:0);
    for(const payload of payloads){
      expect(Object.keys(payload).sort()).toEqual(['armId','counts','reportingDay','schemaVersion','source','studyRevision']);
      expect(JSON.stringify(payload)).not.toMatch(/scrollY|scrollTop|viewport|durationMs|userAgent|fingerprint|clientX|clientY/);
    }
    await expect.poll(()=>receipts.length).toBe(payloads.length);
    expect(receipts.every(status=>status>=200&&status<300)).toBe(true);
    await context.close();
  }
});

test('reports use real stored A/B aggregates, suppress small demo counts and export labelled CSV', async ({ page }) => {
  await page.goto(`/researcher/studies/${studyId}/results`);
  await page.locator('#report-source').selectOption('demo_interaction');
  const demo = await (await page.request.get(`/api/researcher/studies/${studyId}/metrics?source=demo_interaction&publication=${encodeURIComponent(studyPublication)}`)).json();
  expect(demo.rows.length).toBeGreaterThan(0);
  for (const row of demo.rows) {
    expect(row.counts.shown).toBeNull();
    expect(row.counts.help_selected).toBeNull();
    expect(row.rates.help_rate).toBeNull();
  }
  await page.goto('/demo/control');
  await page.locator('#scenario-form [name="siteId"]').selectOption(SITE);
  await page.locator('#scenario-form [name="volume"]').fill('240');
  await page.locator('#scenario-form [name="helpA"]').fill('30');
  await page.locator('#scenario-form [name="helpB"]').fill('60');
  await page.locator('#scenario-form button[type="submit"]').click();
  await expect(page.locator('#control-status')).toContainText(/240/);
  await page.goto(`/researcher/studies/${studyId}/results`);
  await page.locator('#report-source').selectOption('simulation');
  await page.locator('#report-publication').selectOption(studyPublication);
  const report = await (await page.request.get(`/api/researcher/studies/${studyId}/metrics?source=simulation&publication=${encodeURIComponent(studyPublication)}`)).json();
  expect(report.rows.map(row => row.armId).sort()).toEqual(['A', 'B']);
  expect(report.totals.counts.shown).toBe(240);
  expect(report.rows.reduce((sum, row) => sum + row.counts.shown, 0)).toBe(240);
  await expect(page.locator('table').first()).toContainText(report.rows[0].name);
  const downloadPromise = page.waitForEvent('download');
  await page.locator('[data-action="export"]').click();
  const download = await downloadPromise;
  const csv = await readFile(await download.path(), 'utf8');
  expect(csv).toContain('simulation');
  expect(csv).toContain(studyPublication);
  expect(csv).not.toMatch(/visitor|session|ip_address|query_text/i);
  await screenshot(page, 'researcher-outcomes');
  await page.goto(`/researcher/studies/${studyId}/results`);
  await page.locator('#report-source').selectOption('simulation');
  await page.locator('#report-publication').selectOption(studyPublication);
  await expect(page.locator('table').first()).toContainText(report.rows[0].name);
  const comparison=page.getByTestId('outcome-comparison');
  await expect(comparison).toBeVisible();
  for(const row of report.rows)await expect(comparison).toContainText(`${row.rates.help_rate.toFixed(1)}%`);
  const orderedRows=[...report.rows].sort((a,b)=>a.armId.localeCompare(b.armId));
  const difference=Math.round((orderedRows[1].rates.help_rate-orderedRows[0].rates.help_rate)*10)/10;
  await expect(comparison).toContainText(`${difference>0?'+':''}${difference.toFixed(1)} pp`);
  const engagement=page.getByTestId('engagement-results');
  await expect(engagement).toBeVisible();
  for(const row of report.rows){
    const shownRow=engagement.locator('tbody tr').filter({hasText:row.name});
    for(const key of ['retention_30s_rate','scroll_rate','message_end_rate']){
      expect(row.rates[key]).not.toBeNull();
      await expect(shownRow).toContainText(`${row.rates[key].toFixed(1)}%`);
    }
    await expect(shownRow).toContainText(`${row.counts.scrolled} / ${row.counts.engagement_measured}`);
  }
  await screenshot(page, 'researcher-results');
  await mkdir('artifacts/ui-clarity/after',{recursive:true});
  await page.screenshot({path:'artifacts/ui-clarity/after/research-engagement.png',fullPage:true,animations:'disabled'});
});

test('catalogue has local working icons, useful guides, downloads and honest statuses', async ({ page }) => {
  const errors = [];
  page.on('response', response => { if (response.url().includes('/brands/') && response.status() >= 400) errors.push(response.url()); });
  await page.goto('/moderator/integrations');
  await expect(page.locator('[data-integration-view="catalogue"]')).toBeVisible();
  await expect.poll(() => page.locator('.iv-integration-card').count()).toBeGreaterThanOrEqual(20);
  for (const image of await page.locator('[data-integration-grid] img').all()) {
    await image.scrollIntoViewIfNeeded();
    await expect.poll(() => image.evaluate(element => element.complete && element.naturalWidth > 0)).toBe(true);
    expect(new URL(await image.getAttribute('src'), BASE).origin).toBe(BASE);
  }
  expect(errors).toEqual([]);
  await page.locator('[data-integration-search]').fill('WordPress');
  await expect(page.locator('.iv-integration-card')).toHaveCount(1);
  await page.locator('.iv-integration-card').click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Install on WordPress');
  await expect(page.locator('[data-integration-code]').filter({hasText:'[before_demo]'})).toBeVisible();
  await expect(page.locator('.iv-connection-context')).toContainText(await page.locator('#site-selector').inputValue());
  const download = page.locator('.iv-download').first();
  await expect(download).toBeVisible();
  expect((await page.request.get(await download.getAttribute('href'))).ok()).toBeTruthy();
  await screenshot(page, 'integration-guide');
});

test('mobile, Dutch, preview locales and static reduced-motion mode remain usable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openModerator(page, 'intervention');
  await page.getByTestId('language-select').selectOption('nl');
  await expect(page.locator('html')).toHaveAttribute('lang', 'nl');
  await page.locator('[data-builder-tab="preview"]').click();
  await page.locator('[data-info="preview"]').click();
  await page.locator('[name="previewLanguage"]').selectOption('de');
  await expect(page.locator('[name="previewLanguage"]')).toHaveValue('de');
  await expect(page.locator('#shared-preview [data-before-headline]')).toHaveText('Es gibt einen anderen Weg.');
  await expect(page.locator('[name="previewLanguage"] option:checked')).toContainText('Alleen voorvertoning');
  await page.locator('#preview-reduced').check();
  await page.getByRole('dialog').locator('[data-close]').click();
  await expect(page.locator('#shared-preview')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await screenshot(page, 'mobile-dutch-editor');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`/intervention/${SITE}?preview=1&lang=nl&country=NL`);
  await expect(page.locator('html')).toHaveAttribute('lang', 'nl');
  await expect(page.locator('[data-before-stage]')).toBeVisible();
  await expect(page.locator('[data-exit]')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await screenshot(page, 'mobile-dutch-intervention');
});

test('no-JavaScript help stays functional without external asset requests', async ({ browser }) => {
  const context = await browser.newContext({ baseURL: BASE, javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const external = [];
  page.on('request', request => { if (!request.url().startsWith(BASE)) external.push(request.url()); });
  await page.goto('/help?lang=nl&country=NL');
  await expect(page.locator('html')).toHaveAttribute('lang', 'nl');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Vind ondersteuning.');
  await expect(page.locator('a[href="https://preventielijn.offlimits.nl"]')).toBeVisible();
  expect(external).toEqual([]);
  await screenshot(page, 'nojs-help');
  await context.close();
});

test('standalone embed works from a second origin and the React fixture mounts', async ({ page }) => {
  await page.goto('http://localhost:3004/demo/fieldnotes');
  await expect(page.locator('#demo-query')).toBeVisible();
  await expect(page.locator('#demo-search button[type="submit"]')).toBeEnabled();
  await page.locator('#demo-query').fill('test-trigger-red');
  await page.locator('#demo-search').evaluate(form => form.requestSubmit());
  await expect(page).toHaveURL(new RegExp(`localhost:3000/intervention/${SITE}`));
  await expect(page.locator('[data-before-stage]')).toBeVisible();
  expect(page.url()).not.toContain('test-trigger-red');
  await page.goto('/packages/react/example/index.html');
  await expect(page.locator('form')).toBeVisible();
  await expect(page.locator('body')).toContainText(/React/i);
  await expect(page.getByRole('status')).toContainText('Connected');
  await page.getByRole('button', { name: 'Unmount provider' }).click();
  await expect(page.locator('form')).toHaveCount(0);
  await page.getByRole('button', { name: 'Mount provider' }).click();
  await expect(page.getByRole('status')).toContainText('Connected');
  await screenshot(page, 'react-fixture');
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
  await expect(page).toHaveURL(/\/intervention\/demo-forum/);
  await expect(page.locator('[data-before-stage]')).toBeVisible();
});

test('workspace routes load without script errors, failed local resources or external asset requests', async ({ page }) => {
  const errors = [];
  const failures = [];
  const external = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    if (response.url().startsWith(BASE) && response.status() >= 400) failures.push(`${response.status()} ${response.url()}`);
  });
  page.on('request', request => {
    if (!request.url().startsWith(BASE) && !request.url().startsWith('data:')) external.push(request.url());
  });
  for (const route of ['/moderator/overview', '/moderator/intervention', '/moderator/integrations', '/moderator/docs/discord', '/moderator/content', '/researcher/studies', '/researcher/lab', '/demo/forum', '/demo/discord']) {
    await page.goto(route);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('main').first()).toBeVisible();
  }
  await expect(page.locator('.discord-connection')).toContainText('Local preview');
  await page.locator('[data-command="support"]').click();
  await expect(page.locator('.discord-components a[href="https://preventielijn.offlimits.nl"]')).toBeVisible();
  await page.locator('#discord-language').selectOption('nl');
  await page.locator('[data-command="setup"]').click();
  await expect(page.locator('.discord-embed')).toContainText('Alleen een servermoderator');
  await page.locator('#discord-role').selectOption('moderator');
  await page.locator('[data-command="setup"]').click();
  await expect(page.locator('.discord-embed')).toContainText('De synthetische AutoMod-regel staat aan');
  await page.locator('#synthetic-block').click();
  await expect(page.locator('#synthetic-block-result')).toContainText('Geblokkeerd');
  await page.locator('[data-native-action="before:nl:support"]').click();
  await expect(page.locator('.discord-components a[href="https://stoppen-is-mogelijk.eu"]')).toBeVisible();
  await screenshot(page, 'discord-simulator');
  expect(errors).toEqual([]);
  expect(failures).toEqual([]);
  expect(external).toEqual([]);
});
