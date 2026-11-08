import { chromium } from '@playwright/test';
import {mkdir,cp,writeFile,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const root=resolve('artifacts/ui-clarity');
const entries=[
{id:'launcher',title:'Choose a workspace',route:'/',file:'00--.png'},
{id:'moderator-overview',title:'Moderator overview',route:'/moderator/overview',file:'01--moderator-overview.png'},
{id:'message-editor',title:'Message editor',route:'/moderator/intervention',file:'02--moderator-intervention.png'},
{id:'moderator-results',title:'Moderator results',route:'/moderator/analytics',file:'03--moderator-analytics.png'},
{id:'install',title:'Install catalogue',route:'/moderator/integrations',file:'04--moderator-integrations.png'},
{id:'study-review',title:'Moderator study review',route:'/moderator/research',file:'05--moderator-research.png'},
{id:'country-content',title:'Country and language settings',route:'/moderator/content',file:'06--moderator-content.png'},
{id:'wordpress-guide',title:'WordPress installation guide',route:'/moderator/docs/wordpress',file:'08--moderator-docs-wordpress.png'},
{id:'researcher-studies',title:'Research studies',route:'/researcher/studies',file:'12--researcher-studies.png'},
{id:'research-setup',title:'Study setup',route:'/researcher/studies/reflection-first/editor',composerStep:'setup',file:'13--researcher-studies-reflection-first-editor.png'},
{id:'research-composer',title:'Study messages',route:'/researcher/studies/reflection-first/editor',composerStep:'messages',file:'13--researcher-studies-reflection-first-editor.png'},
{id:'research-results',title:'Study results',route:'/researcher/studies/reflection-first/results',file:'14--researcher-studies-reflection-first-results.png'},
{id:'visitor-reflection',title:'Visitor reflection',route:'/intervention/demo-forum?preview=1&lang=en&country=NL',file:'15--intervention-demo-forum-preview-1-lang-en-country-NL.png'},
{id:'visitor-support',title:'Visitor support',route:'/intervention/demo-forum?preview=1&lang=en&country=NL',stage:2,file:'visitor-stage-2.png'},
{id:'help-directory',title:'Help directory',route:'/help',file:'16--help.png'},
{id:'website-demo',title:'Website example',route:'/demo/forum',file:'17--demo-forum.png'},
{id:'wordpress-site',title:'WordPress example',route:'http://localhost:9400/',file:'wordpress-site.png'},
{id:'wordpress-settings',title:'WordPress plugin settings',route:'http://localhost:9400/wp-admin/options-general.php?page=before-prevention',file:'wordpress-settings.png'},
{id:'mobile-overview',title:'Mobile moderator overview',route:'/moderator/overview',mobile:true,file:'mobile--moderator-overview.png'},
{id:'mobile-composer',title:'Mobile study composer',route:'/researcher/studies/reflection-first/editor',composerStep:'messages',mobile:true,file:'mobile--researcher-studies-reflection-first-editor.png'},
{id:'mobile-visitor',title:'Mobile visitor journey',route:'/intervention/demo-forum?preview=1&lang=en&country=NL',mobile:true,file:'mobile--intervention-demo-forum-preview-1-lang-en-country-NL.png'},
];
const mode=process.argv[2]||'after';
await mkdir(`${root}/${mode}`,{recursive:true});
if(mode==='before'){
 for(const entry of entries)await cp(resolve('.before/ui-audit',entry.file),`${root}/before/${entry.id}.png`,{errorOnExist:true,force:false});
 await writeFile(`${root}/manifest.json`,JSON.stringify({beforeSource:'Rendered screenshots captured during the UI audit before this clarity pass. Existing images preserved without alteration.',desktop:{width:1440,height:1000},mobile:{width:390,height:844},state:'Seeded local workspace; MySmall20kUserForum, reflection-first study, English UI. Visitor views use preview=1 and country=NL. Mobile baseline visitor text uses English; controls preserve the original capture state.',entries},null,2));
 console.log(`Preserved ${entries.length} before screenshots.`);process.exit();
}
const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
const context=await browser.newContext({baseURL:'http://localhost:3000',viewport:{width:1440,height:1000},locale:'en-US',reducedMotion:'reduce'});
const page=await context.newPage();const failures=[];let runtimeErrors=[];page.on('pageerror',error=>runtimeErrors.push(error.message));
for(const entry of entries){
 runtimeErrors=[];
 await page.setViewportSize(entry.mobile?{width:390,height:844}:{width:1440,height:1000});
 try{
  await page.goto(entry.route);await page.locator('#main[aria-busy="true"]').waitFor({state:'detached',timeout:10000}).catch(()=>{});if(entry.composerStep)await page.locator(`[data-composer-step="${entry.composerStep}"]`).click();await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(200);
  if(entry.stage!==undefined)await page.locator(`[data-stage="${entry.stage}"]`).first().click();
  if(await page.locator('.error-state').isVisible())throw new Error('The route rendered its error state.');
  if(runtimeErrors.length)throw new Error(runtimeErrors.join('; '));
  await page.screenshot({path:`${root}/after/${entry.id}.png`,fullPage:true,animations:'disabled'});
  console.log(entry.id);
 }catch(error){failures.push({id:entry.id,error:error.message});}
}
await browser.close();
const manifest=JSON.parse(await readFile(`${root}/manifest.json`,'utf8'));manifest.entries=entries;manifest.afterCapturedAt=new Date().toISOString();manifest.failures=failures;await writeFile(`${root}/manifest.json`,JSON.stringify(manifest,null,2));
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
await writeFile(`${root}/index.html`,`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Before UI clarity — screenshot comparisons</title><style>*{box-sizing:border-box}body{margin:0;background:#f8f7f3;color:#26382f;font:16px/1.5 system-ui,sans-serif}header,main{max-width:1600px;margin:auto;padding:28px}h1{margin:0;font-size:30px}header p{max-width:850px;color:#627067}nav{display:flex;gap:8px;flex-wrap:wrap}a{color:#244d3d}nav a{padding:6px 10px;border:1px solid #dce1d8;border-radius:7px;text-decoration:none;font-size:14px}section{margin:0 0 48px;scroll-margin-top:16px}h2{margin-bottom:4px}section>p{font-size:13px;color:#627067;margin-top:0}.pair{display:grid;grid-template-columns:1fr 1fr;gap:18px}.shot{min-width:0;background:white;border:1px solid #dce1d8;border-radius:9px;overflow:hidden}.shot h3{margin:0;padding:10px 14px;border-bottom:1px solid #dce1d8;font-size:14px}.viewport{max-height:850px;overflow:auto;background:#efeee9}.viewport img{display:block;width:100%;height:auto}.mobile .viewport img{max-width:390px;margin:auto}.shot>a{display:block;padding:8px 14px;font-size:13px}footer{padding:24px;color:#627067;font-size:13px}@media(max-width:750px){header,main{padding:18px}.pair{grid-template-columns:1fr}.viewport{max-height:700px}}</style><header><h1>Before UI clarity</h1><p>Matching routes before and after the clarity pass. Desktop captures use 1440 × 1000 viewports; mobile captures use 390 × 844. Screenshots are full-page images, so their heights differ. Scroll each image or open it at full size.</p><nav>${entries.map(e=>`<a href="#${e.id}">${escape(e.title)}</a>`).join('')}</nav></header><main>${entries.filter(e=>!failures.some(f=>f.id===e.id)).map(e=>`<section id="${e.id}" class="${e.mobile?'mobile':''}"><h2>${escape(e.title)}</h2><p>${escape(e.route)}</p><div class="pair">${['before','after'].map(which=>`<article class="shot"><h3>${which==='before'?'Before':'After'}</h3><div class="viewport"><img src="${which}/${e.id}.png" alt="${which==='before'?'Before':'After'}: ${escape(e.title)}" loading="lazy"></div><a href="${which}/${e.id}.png">Open full screenshot</a></article>`).join('')}</div></section>`).join('')}</main><footer>Local demonstration workspace. The comparisons show interface changes, not research outcomes.</footer></html>`);
if(failures.length){console.error(failures);process.exitCode=1;}
