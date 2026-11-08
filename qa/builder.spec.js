import {test,expect} from '@playwright/test';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const BASE='http://localhost:3000',SITE='demo-fieldnotes';
const session=request=>request.post('/api/session',{data:{role:'moderator'}});
const clone=value=>structuredClone(value);
const ids=page=>page.locator('.mb-content-list [data-drag-block]').evaluateAll(rows=>rows.map(row=>row.dataset.dragBlock));
async function addBlock(page,type){const menu=page.locator('.mb-add-block');if(!await menu.evaluate(e=>e.open))await menu.locator('summary').click();await page.locator(`[data-add-block="${type}"]`).click();return page.locator('[data-block-text]').getAttribute('data-block-text');}
async function useTemplate(page,id){await page.locator('[data-message-mode="templates"]').first().click();await page.locator(`[data-use-template="${id}"]`).click();await expect(page.locator('.mb-workspace')).toBeVisible();}
async function mockBuilder(page){
 await session(page.request);const response=await page.request.get(`/api/moderator/sites/${SITE}`);expect(response.ok()).toBeTruthy();const original=await response.json();let site=clone(original);const writes=[],external=[];
 await page.route(url=>url.origin!==BASE&&!['data:','blob:'].includes(url.protocol),route=>{external.push(route.request().url());return route.abort();});
 await page.route('**/api/moderator/sites**',async route=>{
  const request=route.request(),path=new URL(request.url()).pathname,method=request.method();
  if(path==='/api/moderator/sites'&&method==='GET')return route.fulfill({json:[site]});
  if(path===`/api/moderator/sites/${SITE}`&&method==='GET')return route.fulfill({json:site});
  if(path===`/api/moderator/sites/${SITE}/draft`&&method==='GET')return route.fulfill({json:site.draft});
  if(path===`/api/moderator/sites/${SITE}/draft`&&method==='PUT'){const body=request.postDataJSON();writes.push(clone(body));site.draft=clone(body);return route.fulfill({json:site.draft});}
  throw Error(`Unexpected builder request: ${method} ${path}`);
 });
 await page.goto(`/moderator/intervention?site=${SITE}`);await expect(page.locator('.mb-workspace')).toBeVisible();return {original,writes,external};
}

test('six template previews render distinct experiences and applying then undoing restores the exact draft',async({page})=>{
 const fixture=await mockBuilder(page);let metricPosts=0;page.on('request',request=>{if(request.method()==='POST'&&request.url().endsWith('/metrics'))metricPosts++;});
 await page.locator('[data-message-mode="templates"]').first().click();await expect(page.locator('[data-template-card]')).toHaveCount(6);const signatures=[];
 for(const [id,layout,appearance]of [['plain','plain','default'],['calm','reading','default'],['meaning','meaning','default'],['harm','reading','facts'],['quick-help','plain','quick-help'],['guided','scene','guided']]){
  await page.locator(`[data-preview-template="${id}"]`).click();const dialog=page.getByRole('dialog');const rendered=dialog.locator('.before-renderer');await expect(rendered).toBeVisible();await expect(rendered).toHaveAttribute('data-layout',layout);await expect(rendered).toHaveAttribute('data-appearance',appearance);signatures.push([layout,appearance,await rendered.locator('[data-before-headline]').first().innerText()].join('|'));
  await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);
 }
 expect(new Set(signatures).size).toBe(6);expect(fixture.writes).toEqual([]);expect(metricPosts).toBe(0);
 await page.locator('[data-use-template="harm"]').click();await expect(page.locator('#shared-preview')).toHaveAttribute('data-appearance','facts');await page.locator('[data-action="builder-undo"]').click();
 await page.locator('[data-action="save-default"]').click();await expect(page.locator('#action-status')).toContainText(/saved/i);expect(fixture.writes.at(-1)).toEqual(fixture.original.draft);
 expect(fixture.external).toEqual([]);
});

test('mobile bilingual blocks support keyboard reorder, drag reorder, delete and undo without overflow',async({page})=>{
 await page.setViewportSize({width:390,height:844});const fixture=await mockBuilder(page);await useTemplate(page,'calm');
 const first=await addBlock(page,'text');await page.locator(`[data-block-text="${first}"]`).fill('QA first paragraph');await page.locator('[data-edit-language="nl"]').click();await page.locator(`[data-block-text="${first}"]`).fill('QA eerste alinea');
 const second=await addBlock(page,'quote');const before=await ids(page);expect(before.at(-1)).toBe(second);
 await page.locator('[data-block-move="-1"]').focus();await page.keyboard.press('Enter');const moved=await ids(page);expect(moved.indexOf(second)).toBe(before.indexOf(second)-1);
 const transfer=await page.evaluateHandle(()=>new DataTransfer());await page.locator(`[data-drag-block="${second}"]`).dispatchEvent('dragstart',{dataTransfer:transfer});await page.locator(`[data-drag-block="${first}"]`).dispatchEvent('drop',{dataTransfer:transfer});await transfer.dispose();expect((await ids(page)).at(-1)).toBe(second);
 await page.locator(`[data-select-block="${second}"]`).click();await page.locator('[data-action="delete-message-block"]').click();await expect(page.locator(`[data-drag-block="${second}"]`)).toHaveCount(0);await page.locator('[data-action="builder-undo"]').click();await expect(page.locator(`[data-drag-block="${second}"]`)).toBeVisible();await page.locator('[data-action="builder-redo"]').click();await expect(page.locator(`[data-drag-block="${second}"]`)).toHaveCount(0);
 for(const language of ['en','nl']){await page.getByTestId('language-select').selectOption(language);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.locator('[data-builder-tab="preview"]').click();await expect(page.locator('#shared-preview')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.locator('[data-builder-tab="edit"]').click();}
 await page.locator('[data-action="save-default"]').click();await expect(page.locator('#action-status')).toContainText(/saved|opgeslagen/i);const block=fixture.writes.at(-1).blocks.reflection.find(block=>block.id===first);expect(block).toMatchObject({en:'QA first paragraph',nl:'QA eerste alinea'});expect(fixture.external).toEqual([]);
});

test('isolated Fieldnotes draft saves bilingual blocks, reviews and delivers its real publication before conditional restoration',async({page,browser})=>{
 await session(page.request);const original=await(await page.request.get(`/api/moderator/sites/${SITE}`)).json();const name=`QA builder ${Date.now()}`;let publicationKey,ownedDraft,disabledEnrolment=false;
 try{
  if(original.enrolment?.enabled){const result=await page.request.put(`/api/moderator/sites/${SITE}/enrolment`,{data:{...original.enrolment,enabled:false}});expect(result.ok()).toBeTruthy();disabledEnrolment=true;}
  await page.goto(`/moderator/intervention?site=${SITE}`);await expect(page.locator('#site-selector')).toHaveValue(SITE);await useTemplate(page,'plain');await page.locator('[data-inspector-tab="design"]').click();await page.locator('[name="intervention:name"]').fill(name);await page.locator('[data-inspector-tab="content"]').click();
  const blockId=await addBlock(page,'callout');const copy={en:`QA bilingual support note ${Date.now()}`,nl:`QA tweetalige hulptekst ${Date.now()}`};
  for(const language of ['en','nl']){await page.locator(`[data-edit-language="${language}"]`).click();await page.locator(`[data-block-text="${blockId}"]`).fill(copy[language]);await expect(page.locator(`#shared-preview [data-message-block="${blockId}"]`)).toContainText(copy[language]);}
  await page.locator('[data-action="save-default"]').click();await expect(page.locator('#action-status')).toContainText(/saved/i);let saved=await(await page.request.get(`/api/moderator/sites/${SITE}`)).json();ownedDraft=clone(saved.draft);expect(saved.activePublication).toBe(original.activePublication);expect(saved.draft.blocks.education.find(block=>block.id===blockId)).toMatchObject(copy);
  await page.locator('[data-action="review-default"]').click();const dialog=page.getByRole('dialog');await dialog.locator('#review-language').selectOption('nl');await expect(dialog.locator(`[data-message-block="${blockId}"]`)).toContainText(copy.nl);await page.getByTestId('publish-intervention').click();await expect(page.locator('#action-status')).toContainText(/published/i);
  saved=await(await page.request.get(`/api/moderator/sites/${SITE}`)).json();publicationKey=saved.activePublication;expect(publicationKey).not.toBe(original.activePublication);
  let manifest=[];try{manifest=JSON.parse(await readFile('.before/qa/builder-created-publications.json','utf8'));}catch{}manifest.push({siteId:SITE,publicationKey,name,previousPublication:original.activePublication});await mkdir('.before/qa',{recursive:true});await writeFile('.before/qa/builder-created-publications.json',JSON.stringify(manifest,null,2));
  for(const language of ['en','nl']){const context=await browser.newContext({baseURL:BASE,locale:language==='nl'?'nl-NL':'en-US'});const visitor=await context.newPage();let metrics=0;context.on('request',request=>{if(request.method()==='POST'&&request.url().endsWith('/metrics'))metrics++;});await visitor.goto(`/intervention/${SITE}?preview=1&lang=${language}&country=NL`);await expect(visitor.locator(`[data-message-block="${blockId}"]`)).toContainText(copy[language]);await expect(visitor.locator('[data-enforcement-notice]')).toBeVisible();expect(metrics).toBe(0);await context.close();}
  const context=await browser.newContext({baseURL:BASE});const visitor=await context.newPage();await visitor.goto(`/intervention/${SITE}?preview=1&lang=en&country=UNKNOWN`);await expect(visitor.locator('[data-enforcement-notice]')).toHaveCount(0);await expect(visitor.locator('#journey')).not.toContainText(/article\s*(252|254)|maximum sentence/i);const config=await(await visitor.request.get(`/api/public/sites/${SITE}/config?lang=en&country=UNKNOWN`)).json();expect(config.legalPack).toBeNull();await context.close();
 }finally{
  await session(page.request);let current=await(await page.request.get(`/api/moderator/sites/${SITE}`)).json();
  if(publicationKey&&current.activePublication===publicationKey)expect((await page.request.post(`/api/moderator/sites/${SITE}/revert`,{data:{publicationKey:original.activePublication}})).ok()).toBeTruthy();
  current=await(await page.request.get(`/api/moderator/sites/${SITE}`)).json();if(current.draft?.name===name||ownedDraft&&JSON.stringify(current.draft)===JSON.stringify(ownedDraft))expect((await page.request.put(`/api/moderator/sites/${SITE}/draft`,{data:original.draft})).ok()).toBeTruthy();
  if(disabledEnrolment&&current.enrolment?.studyRevision===original.enrolment.studyRevision&&!current.enrolment.enabled)expect((await page.request.put(`/api/moderator/sites/${SITE}/enrolment`,{data:original.enrolment})).ok()).toBeTruthy();
 }
});
