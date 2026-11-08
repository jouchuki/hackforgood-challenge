import {test,expect} from '@playwright/test';

const BASE='http://localhost:3000';
const APP='123456789012345678';
const GUILD='234567890123456789';
const INVITE=`https://discord.com/oauth2/authorize?client_id=${APP}&scope=bot+applications.commands&permissions=32&guild_id=${GUILD}&disable_guild_select=true`;
const checks={configuration:true,gateway:false,server:false,permissions:false,commands:false,protection:false};
const state=(status,extra={})=>({status,applicationId:APP,guildId:GUILD,installUrl:INVITE,siteId:'demo-forum',checks:{...checks},serverName:null,checkedAt:null,errorCode:null,...extra});
const ready=()=>state('ready',{checks:{configuration:true,gateway:true,server:true,permissions:true,commands:true,protection:true},serverName:'Private test community',checkedAt:'2026-11-08T12:00:00.000Z'});
const setupRequired=()=>state('setup_required',{checks:{...ready().checks,protection:false},serverName:'Private test community'});

async function mockedSetup(page,initial,{connect}={}){
 let current=initial;const calls={get:0,connect:0,external:[],bodies:[]};
 await page.route(url=>url.origin!==BASE&&!['data:','blob:'].includes(url.protocol),route=>{calls.external.push(route.request().url());return route.abort();});
 await page.route(url=>url.origin===BASE&&(url.pathname.startsWith('/api/moderator/discord')||url.pathname.startsWith('/api/moderator/integrations/discord')),async route=>{
  const request=route.request();const url=new URL(request.url());
  if(url.pathname==='/api/moderator/integrations/discord/config'&&request.method()==='GET')return route.fulfill({json:{applicationId:initial.applicationId,guildId:initial.guildId,siteId:initial.siteId,country:'NL',tokenConfigured:initial.checks.configuration,clientSecretConfigured:false}});
  if(url.pathname==='/api/moderator/integrations/discord/oauth/status'&&request.method()==='GET')return route.fulfill({json:{configured:false,connected:false,user:null,guilds:[]}});
  if(url.pathname==='/api/moderator/discord'&&request.method()==='GET'){calls.get++;return route.fulfill({status:current.httpError||200,json:current.httpError?{error:current.error||'Status unavailable.'}:current});}
  if(url.pathname==='/api/moderator/discord/connect'&&request.method()==='POST'){calls.connect++;calls.bodies.push(request.postDataJSON());const next=connect?await connect(calls.connect):current;if(next?.httpError)return route.fulfill({status:next.httpError,json:{error:next.error||'The connection could not be verified.'}});current=next;return route.fulfill({status:200,json:current});}
  throw Error(`Unexpected Discord controller request: ${request.method()} ${url.pathname}`);
 });
 await page.goto('/moderator/docs/discord');await expect(page.locator('#discord-connection')).toBeVisible();
 return {calls,setState:value=>current=value};
}
const status=page=>page.locator('#discord-connection-status');
const connect=page=>page.locator('[data-integration-discord-connect]');

async function secretsStayMasked(page){
 for(const name of ['token','clientSecret']){await expect(page.locator(`[name="${name}"]`)).toHaveAttribute('type','password');await expect(page.locator(`[name="${name}"]`)).toHaveValue('');}
 await expect(page.locator('a[href*="/demo/discord"]')).toHaveCount(0);
 await expect(page.locator('body')).not.toContainText('A locally hosted Discord bot with private support interactions.');
}

test('Discord setup requests protected owner configuration without exposing saved credentials or attempting connection',async({page})=>{
 const {calls}=await mockedSetup(page,state('configuration_required',{applicationId:null,guildId:null,installUrl:null,checks:{...checks,configuration:false},errorCode:'configuration_required'}));
 await expect(status(page)).toContainText(/configuration|setup|operator|required|credentials|connect your bot/i);await secretsStayMasked(page);
 await expect(page.locator('a[data-discord-install]')).toHaveCount(0);
 await expect(connect(page)).toBeDisabled();expect(calls.connect).toBe(0);expect(calls.external).toEqual([]);
});

test('Discord return focus updates an installation to ready without starting a connection',async({page})=>{
 const {calls,setState}=await mockedSetup(page,state('not_installed'));
 await expect(page.locator('a[data-discord-install]')).toHaveAttribute('href',INVITE);await expect(connect(page)).toBeEnabled();
 const initialGets=calls.get;setState(ready());await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await expect.poll(()=>calls.get).toBeGreaterThan(initialGets);await expect(status(page)).toContainText(/ready|connected|protection active/i);
 expect(calls.connect).toBe(0);expect(calls.external).toEqual([]);await secretsStayMasked(page);
});

test('Discord installation uses the configured app and guild with minimal bot and command scopes',async({page})=>{
 const {calls}=await mockedSetup(page,state('not_installed',{checks:{...checks,gateway:true},errorCode:'not_installed'}));
 const install=page.locator('a[data-discord-install]');await expect(install).toBeVisible();
 const url=new URL(await install.getAttribute('href'));expect(url.origin).toBe('https://discord.com');expect(url.pathname).toMatch(/\/oauth2\/authorize$/);expect(url.searchParams.get('client_id')).toBe(APP);expect(url.searchParams.get('guild_id')).toBe(GUILD);
 expect(new Set(url.searchParams.get('scope').split(/\s+/))).toEqual(new Set(['bot','applications.commands']));
 const permission=BigInt(url.searchParams.get('permissions'));expect(permission&32n).toBe(32n);expect(permission&8n).toBe(0n);
 await expect(status(page)).not.toHaveText(/^(Ready|Connected|Bot connected|Protection active)\b/i);await secretsStayMasked(page);expect(calls.connect).toBe(0);expect(calls.external).toEqual([]);
});

test('Discord ready state requires protection and presents immediate testing without a setup command',async({page})=>{
 const {calls}=await mockedSetup(page,ready());await expect(status(page)).toContainText(/ready|connected|protection active/i);
 for(const key of ['configuration','gateway','server','permissions','commands','protection'])await expect(page.locator(`[data-discord-check="${key}"]`)).toHaveAttribute('data-passed','true');
 const testSection=page.locator('.iv-discord-test');await expect(testSection).toContainText('test-trigger-red');const standalone=page.locator('.iv-standalone');await standalone.locator('summary').click();await expect(standalone).toContainText('/before support');await expect(standalone).toContainText('/before demo');await expect(testSection).not.toContainText('/before setup');
 await expect(page.locator('#discord-connection')).not.toContainText('/before setup');
 await expect(page.locator('#discord-connection')).toContainText('Private test community');await secretsStayMasked(page);expect(calls.connect).toBe(0);expect(calls.external).toEqual([]);
});

test('Discord setup cannot advertise ready while protection is missing and exposes Finish setup',async({page})=>{
 const {calls}=await mockedSetup(page,state('ready',{checks:{...ready().checks,protection:false}}));
 await expect(status(page)).not.toHaveText(/^(Ready|Connected|Bot connected|Protection active)\b/i);await expect(connect(page)).toContainText(/enable message blocking|finish setup/i);
 await expect(page.locator('[data-discord-check="protection"]')).toHaveAttribute('data-passed','false');await expect(page.locator('.iv-discord-test')).toHaveCount(0);expect(calls.connect).toBe(0);expect(calls.external).toEqual([]);
});

test('Discord setup cannot advertise ready while slash command verification is incomplete',async({page})=>{
 await mockedSetup(page,state('ready',{checks:{...ready().checks,commands:false},serverName:'Private test community'}));
 await expect(status(page)).not.toHaveText(/^(Ready|Connected|Bot connected|Protection active)\b/i);
 await expect(page.locator('[data-discord-check="commands"]')).toHaveAttribute('data-passed','false');await secretsStayMasked(page);
});

test('Discord protection error offers retry and replaces stale failure state with verified protection',async({page})=>{
 const {calls}=await mockedSetup(page,state('protection_error',{checks:{...ready().checks,protection:false},errorCode:'protection_setup_failed'}),{connect:()=>ready()});
 await expect(status(page)).toContainText(/attention|not be verified|error|failed|unable|retry/i);await expect(connect(page)).toBeEnabled();await connect(page).click();await expect(status(page)).toContainText(/ready|connected|protection active/i);
 expect(calls.connect).toBe(1);expect(calls.bodies).toEqual([{}]);expect(calls.external).toEqual([]);await secretsStayMasked(page);
});

test('Discord Finish setup sends one empty request despite repeated pending clicks',async({page})=>{
 let release;const response=new Promise(resolve=>release=resolve);
 const {calls}=await mockedSetup(page,setupRequired(),{connect:()=>response});
 await expect(connect(page)).toContainText(/enable message blocking|finish setup/i);
 await connect(page).click();
 try{await expect(connect(page)).toBeDisabled();await expect.poll(()=>calls.connect).toBe(1);const box=await connect(page).boundingBox();await page.mouse.click(box.x+box.width/2,box.y+box.height/2);await page.mouse.click(box.x+box.width/2,box.y+box.height/2);expect(calls.connect).toBe(1);}finally{release(ready());}
 await expect(status(page)).toContainText(/ready|connected|protection active/i);await expect(connect(page)).toBeEnabled();
 expect(calls.bodies).toEqual([{}]);expect(calls.external).toEqual([]);
});

test('Discord connecting state polls status only and shows a completed automatic installation',async({page})=>{
 const {calls,setState}=await mockedSetup(page,state('connecting'));
 const initialGets=calls.get;setState(ready());
 await expect.poll(()=>calls.get,{timeout:10000}).toBeGreaterThan(initialGets);await expect(status(page)).toContainText(/ready|connected|protection active/i);
 expect(calls.connect).toBe(0);expect(calls.external).toEqual([]);
});

test('Discord failed Finish setup keeps retry available and a later attempt verifies protection',async({page})=>{
 const {calls}=await mockedSetup(page,setupRequired(),{connect:attempt=>attempt===1?{httpError:503,error:'Connection verification timed out. Try again.'}:ready()});
 await connect(page).click();await expect(status(page)).toContainText(/timed out|attention|not be verified|try again|reconnect|could not confirm/i);await expect(connect(page)).toBeEnabled();
 await expect(page.locator('.iv-discord-test')).toHaveCount(0);await connect(page).click();await expect(status(page)).toContainText(/ready|connected|protection active/i);
 expect(calls.connect).toBe(2);expect(calls.bodies).toEqual([{},{}]);expect(calls.external).toEqual([]);
});

test('Discord failed status refresh removes stale readiness without attempting setup',async({page})=>{
 const {calls,setState}=await mockedSetup(page,ready());await expect(status(page)).toContainText(/ready|connected|protection active/i);setState({httpError:503});
 await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await expect(status(page)).toContainText(/attention|not be verified|reconnect|could not confirm/i);await expect(page.locator('.iv-discord-test')).toHaveCount(0);
 await expect(page.locator('[data-discord-check="protection"]')).toHaveAttribute('data-passed','false');await expect(connect(page)).toBeEnabled();expect(calls.connect).toBe(0);expect(calls.external).toEqual([]);
});

test('Discord Dutch mobile header and ready actions fit at 390 pixels through language switching',async({page})=>{
 await page.setViewportSize({width:390,height:844});const {calls}=await mockedSetup(page,ready());
 for(const language of ['nl','en']){
  await page.getByTestId('language-select').selectOption(language);await expect(status(page)).toContainText(language==='nl'?/Bescherming actief/:/Protection active/);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  for(const selector of ['.breadcrumbs [data-action="mobile-nav"]','.topbar-actions [data-info="workspace"]','#ui-language','.iv-discord-test a[href^="https://discord.com/channels/"]','[data-integration-discord-connect]']){
   const control=page.locator(selector);await expect(control).toBeVisible();const box=await control.boundingBox();expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(390);
  }
  for(const key of ['configuration','gateway','server','permissions','commands','protection'])await expect(page.locator(`[data-discord-check="${key}"]`)).toHaveAttribute('data-passed','true');
 }
 expect(calls.connect).toBe(0);expect(calls.external).toEqual([]);
});
