import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const BASE='http://localhost:3000';

test('ordinary workspace routes keep disclosures behind icon buttons and omit simulator links',async({page})=>{
 for(const route of ['/','/moderator/overview','/researcher/studies/reflection-first/results','/moderator/integrations','/moderator/docs/discord','/researcher/studies']){
  await page.goto(route);
  await expect(page.locator('a[href*="/demo/discord"]')).toHaveCount(0);
  await expect(page.getByText('Synthetic demo traffic only',{exact:true})).toBeHidden();
  await expect(page.getByText('Running simulation',{exact:true})).toBeHidden();
  await expect(page.getByText('Awaiting participation',{exact:true})).toBeHidden();
 }
 await page.goto('/moderator/overview');
 const info=page.locator('[data-info="workspace"]').first();
 await expect(info).toBeVisible();
 await expect(info.locator('svg')).toHaveCount(1);
 expect((await info.innerText()).trim()).toBe('');
 expect(await info.getAttribute('aria-label')).toBeTruthy();
 await info.click();
 await expect(page.getByRole('dialog')).toBeVisible();
 await expect(page.getByRole('dialog')).toContainText(/privacy|tracking|synthetic|simulation/i);
 await page.keyboard.press('Escape');
 await expect(page.getByRole('dialog')).toBeHidden();
});

test('unsaved navigation offers a genuine keep-or-discard choice',async({page})=>{
 await page.goto('/moderator/intervention');
 const title=page.locator('[name="copy:title"]');
 const original=await title.inputValue();
 await title.fill('Unsaved clarity audit — not persisted');
 await page.getByRole('link',{name:'Overview',exact:true}).click();
 const dialog=page.getByRole('dialog');
 await expect(dialog).toBeVisible();
 await dialog.getByRole('button',{name:'Keep editing',exact:true}).click();
 await expect(page).toHaveURL(/\/moderator\/intervention$/);
 await expect(title).toHaveValue('Unsaved clarity audit — not persisted');
 await page.getByRole('link',{name:'Overview',exact:true}).click();
 await page.getByRole('dialog').getByRole('button',{name:'Discard changes',exact:true}).click();
 await expect(page).toHaveURL(/\/moderator\/overview$/);
 await page.getByRole('link',{name:/^(Message|Intervention editor)$/i}).click();
 await expect(page.locator('[name="copy:title"]')).toHaveValue(original);
});

test('education-first research variants edit the actual stage shown in the preview',async({page})=>{
 await page.goto('/researcher/studies/reflection-first/editor');
 await page.locator('[data-composer-step="messages"]').click();
 await page.locator('[data-arm="0"]').click();
 await expect(page.locator('[data-edit-stage="education"]')).toBeVisible();
 await page.locator('[data-edit-stage="education"]').click();
 const title=page.locator('[name="copy:educationTitle"]');
 await expect(title).toBeVisible();
 await expect(page.locator('[name="copy:title"]')).toBeHidden();
 await expect(page.locator('#shared-preview [data-before-headline]')).toHaveText(await title.inputValue());
 await title.fill('Education stage clarity proof');
 await expect(page.locator('#shared-preview [data-before-headline]')).toHaveText('Education stage clarity proof');
 await page.locator('[data-edit-stage="support"]').click();
 await expect(page.locator('[name="copy:helpTitle"]')).toBeVisible();
 await expect(page.locator('#shared-preview [data-before-headline]')).toHaveText(await page.locator('[name="copy:helpTitle"]').inputValue());
});

test('optional motion controls stay out of the default editing path',async({page})=>{
 await page.goto('/moderator/intervention');
 const advanced=page.locator('#advanced-settings');
 await expect(advanced).toBeHidden();
 await expect(page.locator('[name="motion:holdSeconds"]')).toBeHidden();
 await page.locator('[data-inspector-tab="design"]').click();await expect(advanced).toBeVisible();
 if(!await advanced.evaluate(element=>element.open))await advanced.locator('summary').click();
 await expect(page.locator('[name="motion:enabled"]')).not.toBeChecked();
 await expect(page.locator('[name="motion:holdSeconds"]')).toBeHidden();
 await page.locator('[name="motion:enabled"]').check();
 await expect(page.locator('[name="motion:holdSeconds"]')).toBeVisible();
});

test('mobile study editing separates editing and preview without overflow',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/researcher/studies/reflection-first/editor');
 await page.locator('[data-composer-step="messages"]').click();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await expect(page.locator('#arm-editor')).toBeVisible();
 // A dedicated preview tab must make the preview reachable without traversing the entire form.
 const preview=page.locator('[data-builder-tab="preview"]');
 await expect(preview).toBeVisible();
 await preview.click();
 await expect(page.locator('#shared-preview')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('deployment verification requires a real SDK submission and rendered handoff without collector events',async({page,browser})=>{
 await page.goto('/moderator/integrations');
 const started=page.waitForResponse(response=>response.request().method()==='POST'&&response.url().endsWith('/api/moderator/sites/demo-forum/deployment'));
 await page.locator('[data-action="check-deployment"]').first().click();
 const response=await started;
 expect(response.ok()).toBeTruthy();
 const initial=await response.json();
 expect(initial.verification.status).toBe('checking');
 expect(initial.verification.steps).toEqual({sdk:false,submitted:false,rendered:false});
 expect(initial.checks.every(check=>check.status==='passed')).toBe(true);
 expect(initial.testUrl).toMatch(/^http:\/\/localhost:3000\/demo\/forum\?before_check=[a-f0-9]{32}$/);
 const context=await browser.newContext({baseURL:BASE,locale:'en-US'});
 const installation=await context.newPage();
 const receipts=[];let metricPosts=0;
 installation.on('request',request=>{
  if(request.method()!=='POST')return;
  if(request.url().endsWith('/deployment-check'))receipts.push(request.postDataJSON());
  if(request.url().endsWith('/metrics'))metricPosts++;
 });
 await installation.goto(initial.testUrl);
 await expect(installation.locator('#demo-search button[type="submit"]')).toBeEnabled();
 await installation.locator('#demo-query').fill('test-trigger-red');
 await installation.locator('#demo-search').evaluate(form=>form.requestSubmit());
 await expect(installation).toHaveURL(/\/intervention\/demo-forum\?.*before_check=/);
 await expect(installation.locator('[data-before-stage]')).toBeVisible();
 await expect.poll(async()=>{
  const state=await (await page.request.get('/api/moderator/sites/demo-forum/deployment')).json();
  return state.verification.status;
 }).toBe('verified');
 expect([...new Set(receipts.map(receipt=>receipt.step))]).toEqual(['sdk','submitted','rendered']);
 for(const receipt of receipts){expect(Object.keys(receipt).sort()).toEqual(['step','token']);expect(JSON.stringify(receipt)).not.toContain('test-trigger-red');}
 await installation.locator('[data-stage="1"]').first().click();
 await installation.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));
 await installation.waitForTimeout(200);
 expect(metricPosts).toBe(0);
 await context.close();
 await page.reload();
 await expect(page.locator('#deployment-status')).toContainText(/verified|working/i);
 await mkdir('artifacts/ui-clarity/after',{recursive:true});
 await page.screenshot({path:'artifacts/ui-clarity/after/deployment-verified.png',fullPage:true,animations:'disabled'});
});

test('editing a message enables Review publication without publishing the seed study',async({page})=>{
 await page.goto('/researcher/studies/reflection-first/editor');
 await page.locator('.wk-composer-steps [data-composer-step="review"]').click();
 const publish=page.getByTestId('publish-study');
 await expect(publish).toBeDisabled();
 await page.locator('.wk-composer-steps [data-composer-step="messages"]').click();
 await page.locator('[data-arm="0"]').click();await page.locator('[data-edit-stage="education"]').click();
 await page.locator('[name="copy:educationTitle"]').fill('A clearer information step.');
 await expect(page.locator('#shared-preview [data-before-headline]')).toHaveText('A clearer information step.');
 await page.locator('.wk-composer-steps [data-composer-step="review"]').click();
 await expect(page.getByTestId('publish-study')).toBeEnabled();
});

test('Save and leave persists the draft before navigation and leaves the publication unchanged',async({page})=>{
 await page.goto('/moderator/intervention');await page.locator('#site-selector').selectOption('demo-fieldnotes');
 await expect(page.locator('#site-selector')).toHaveValue('demo-fieldnotes');
 await expect(page.locator('#main')).not.toHaveAttribute('aria-busy','true');
 const original=await(await page.request.get('/api/moderator/sites/demo-fieldnotes')).json();
 try{
  await page.locator('[name="copy:title"]').fill('Saved from the navigation guard.');
  await page.getByRole('link',{name:'Overview',exact:true}).click();
  await page.getByRole('dialog').getByRole('button',{name:'Save and leave',exact:true}).click();
  await expect(page).toHaveURL(/\/moderator\/overview$/);
  const saved=await(await page.request.get('/api/moderator/sites/demo-fieldnotes')).json();
  expect(saved.draft.en.title).toBe('Saved from the navigation guard.');
  expect(saved.activePublication).toBe(original.activePublication);
 }finally{
  const restored=await page.request.put('/api/moderator/sites/demo-fieldnotes/draft',{data:original.draft});expect(restored.ok()).toBeTruthy();
 }
});
