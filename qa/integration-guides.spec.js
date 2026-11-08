import {test,expect} from '@playwright/test';
const BASE='http://localhost:3000',SITE='demo-fieldnotes';
const signatures={javascript:/<script/,react:/BeforeProvider/,wordpress:/before_demo/,nextjs:/use client/,vue:/onMounted/,nuxt:/defineNuxtPlugin/,svelte:/onMount/,astro:/<script/,angular:/ngOnDestroy|DestroyRef/,express:/render|ejs/,django:/template|{%|block/,laravel:/Blade|@|blade/,rails:/javascript_include_tag|content_for/,drupal:/libraries|attach_library/,joomla:/WebAssetManager|getWebAssetManager/,discourse:/apiInitializer|api\.onPageChange|theme/,nodebb:/widget|custom|script/i,flarum:/extend|Frontend/,phpbb:/overall_footer|EVENT|template/i,xenforo:/PAGE_CONTAINER|template/i,invision:/globalTemplate|theme/i,tor:/HiddenServiceDir/};

test('all 23 integration entries provide real platform guides, copyable code, sources and honest delivery methods',async({page})=>{
 test.setTimeout(120000);const external=[],writes=[];
 await page.addInitScript(()=>{globalThis.__qaClipboard=[];Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>globalThis.__qaClipboard.push(text)}});});
 await page.route(url=>url.origin!==BASE&&!['data:','blob:'].includes(url.protocol),route=>{external.push(route.request().url());return route.abort();});
 await page.route('**/api/moderator/**',route=>{if(!['GET','HEAD'].includes(route.request().method())){writes.push(route.request().url());return route.abort();}return route.fallback();});
 await page.goto(`/moderator/integrations?site=${SITE}`);await expect(page.locator('.iv-integration-card')).toHaveCount(23);
 const entries=await page.locator('.iv-integration-card').evaluateAll(cards=>cards.map(card=>({href:card.getAttribute('href'),name:card.querySelector('h2').textContent,method:card.querySelector('div>span').textContent})));
 expect(entries.filter(item=>item.method==='Package')).toHaveLength(3);expect(entries.filter(item=>item.method==='Bot connection')).toHaveLength(1);
 for(const entry of entries){
  const id=entry.href.split('/').at(-1);await page.goto(`${entry.href}?site=${SITE}`);await expect(page.getByRole('heading',{level:1})).toContainText(entry.name);
  const view=page.locator('[data-integration-view]');await expect(view).toBeVisible();
  if(id==='discord'){await expect(view).toHaveAttribute('data-integration-view','discord');continue;}
  await expect(view).toHaveAttribute('data-integration-id',id);expect(await page.locator('.iv-install-step').count()).toBeGreaterThanOrEqual(2);
  const code=page.locator('[data-integration-code]');expect(await code.count()).toBeGreaterThan(0);const snippets=(await code.allTextContents()).join('\n');expect((await page.locator('.iv-install-step').allTextContents()).join('\n')).toMatch(signatures[id]);expect(snippets).not.toMatch(/\{\{(?:endpoint|siteId)\}\}/);
  await expect(page.locator('.iv-connection-context')).not.toContainText(SITE);await expect(page.locator('.iv-connection-context')).not.toContainText('Installation');await expect(page.locator('.iv-connection-context')).toContainText(BASE);expect(await page.locator('.iv-reference').count()).toBeGreaterThan(0);
  for(const href of await page.locator('.iv-reference').evaluateAll(links=>links.map(link=>link.href)))expect(new URL(href).protocol).toBe('https:');
  await page.locator('[data-integration-copy]').first().click();expect(await page.evaluate(()=>globalThis.__qaClipboard.at(-1))).toBe(await code.first().textContent());
  await expect(page.locator('[data-integration-download-guide]')).toBeVisible();
  for(const download of await page.locator('.iv-download').all()){await expect(download).toBeVisible();expect((await page.request.get(await download.getAttribute('href'))).ok()).toBeTruthy();}
  if(id==='tor')await expect(page.locator('.iv-download')).toHaveCount(0);
 }
 expect(writes).toEqual([]);expect(external).toEqual([]);
});

test('integration guide saves an intercepted website origin and waits for actual rendered deployment proof',async({page})=>{
 const writes=[];let checking=false,complete=false;
 await page.route(`**/api/moderator/sites/${SITE}`,async route=>{if(route.request().method()!=='PUT')return route.fallback();const body=route.request().postDataJSON();writes.push(body);return route.fulfill({json:{id:SITE,name:'Fieldnotes',origins:body.origins}});});
 const verification=()=>({checks:[{id:'service',status:'passed'},{id:'package',status:'passed'},{id:'configuration',status:'passed'},{id:'origin',status:'passed'}],verification:{status:complete?'verified':checking?'checking':'not_checked',steps:{sdk:complete,submitted:complete,rendered:complete}},testUrl:`${BASE}/demo/reading?before_check=qa`});
 await page.route(`**/api/moderator/sites/${SITE}/deployment`,route=>{if(route.request().method()==='POST')checking=true;return route.fulfill({json:verification()});});
 await page.goto(`/moderator/docs/javascript?site=${SITE}`);const form=page.locator('[data-integration-origin-form]');await form.locator('[name="origin"]').fill('https://qa-community.example/path');await form.locator('[type="submit"]').click();await expect(page.locator('[data-integration-origin-status]')).toContainText('Website saved');expect(writes[0].origins).toContain('https://qa-community.example');expect(writes[0].origins).not.toContain('https://qa-community.example/path');
 await page.locator('[data-integration-verify]').click();await expect(page.locator('[data-integration-verification]')).toContainText('Complete the website check');await expect(page.locator('[data-integration-verification]')).not.toContainText('Installation verified');complete=true;await expect(page.locator('[data-integration-verification]')).toContainText('Installation verified',{timeout:8000});
});

test('Discord guide preserves unsaved credentials on refresh and submits only to intercepted local settings',async({page})=>{
 const app='123456789012345678',guild='234567890123456789',otherGuild='345678901234567890',posts=[],external=[];let settings={applicationId:app,guildId:guild,siteId:SITE,country:'NL',tokenConfigured:true,clientSecretConfigured:true,redirectUri:`${BASE}/api/moderator/integrations/discord/oauth/callback`,apiOrigin:BASE,publicOrigin:BASE};
 const connection={status:'not_installed',applicationId:app,guildId:guild,installUrl:`https://discord.com/oauth2/authorize?client_id=${app}&scope=bot+applications.commands&permissions=32`,siteId:SITE,checks:{configuration:true,gateway:true,server:false,permissions:false,commands:false,protection:false}};
 await page.route(url=>url.origin!==BASE&&!['data:','blob:'].includes(url.protocol),route=>{external.push(route.request().url());return route.abort();});
 await page.route(url=>url.pathname.startsWith('/api/moderator/integrations/discord')||url.pathname.startsWith('/api/moderator/discord'),async route=>{
  const request=route.request(),path=new URL(request.url()).pathname;
  if(path==='/api/moderator/discord'&&request.method()==='GET')return route.fulfill({json:connection});
  if(path==='/api/moderator/integrations/discord/oauth/status'&&request.method()==='GET')return route.fulfill({json:{configured:true,connected:true,user:{username:'QA operator'},guilds:[{id:otherGuild,name:'QA managed server'}]}});
  if(path==='/api/moderator/integrations/discord/config'&&request.method()==='GET')return route.fulfill({json:settings});
  if(path==='/api/moderator/integrations/discord/config'&&request.method()==='POST'){const body=request.postDataJSON();posts.push(body);settings={...settings,applicationId:body.applicationId,guildId:body.guildId};return route.fulfill({json:settings});}
  throw Error(`Unexpected Discord credentials request: ${request.method()} ${path}`);
 });
 await page.goto(`/moderator/docs/discord?site=${SITE}`);await expect(page.locator('[data-integration-discord-settings]')).toHaveCount(1);const details=page.locator('.iv-credential-settings');if(!await details.evaluate(e=>e.open))await details.locator('summary').first().click();const form=page.locator('[data-integration-discord-settings]');
 for(const name of ['token','clientSecret']){await expect(form.locator(`[name="${name}"]`)).toHaveAttribute('type','password');await expect(form.locator(`[name="${name}"]`)).toHaveValue('');}
 await form.locator('[name="token"]').fill('QA_FAKE_BOT_TOKEN_NEVER_SENT');const oauthDetails=page.locator('.iv-oauth-settings').filter({has:page.locator('[name="clientSecret"]')});if(!await oauthDetails.evaluate(e=>e.open))await oauthDetails.locator('summary').click();await form.locator('[name="clientSecret"]').fill('QA_FAKE_OAUTH_SECRET_NEVER_SENT');await page.locator('[data-integration-oauth-guild]').selectOption(otherGuild);await expect(form.locator('[name="guildId"]')).toHaveValue(otherGuild);
 await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await expect(form.locator('[name="token"]')).toHaveValue('QA_FAKE_BOT_TOKEN_NEVER_SENT');await expect(form.locator('[name="guildId"]')).toHaveValue(otherGuild);
 await form.locator('[type="submit"]').click();await expect.poll(()=>posts.length).toBe(1);expect(posts[0]).toMatchObject({applicationId:app,guildId:otherGuild,token:'QA_FAKE_BOT_TOKEN_NEVER_SENT',clientSecret:'QA_FAKE_OAUTH_SECRET_NEVER_SENT',siteId:SITE});
 await expect(form.locator('[name="token"]')).toHaveValue('');await expect(form.locator('[name="clientSecret"]')).toHaveValue('');await expect(page.locator('body')).not.toContainText('QA_FAKE_BOT_TOKEN_NEVER_SENT');await expect(page.locator('body')).not.toContainText('QA_FAKE_OAUTH_SECRET_NEVER_SENT');expect(external).toEqual([]);
});
