import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, stat, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createDiscordIntegrationSettings } from '../server/integration-settings.js';
const appId='123456789012345678',guildId='234567890123456789',token='SYNTHETIC_DISCORD_SECRET_FOR_UNIT_TESTS';
async function fixture(t,source=`# owner comment\nDISCORD_APPLICATION_ID=${appId}\nDISCORD_TEST_GUILD_ID=${guildId}\nDISCORD_BOT_TOKEN=${token}\nBEFORE_SITE_ID=demo-forum\nUNCHANGED_FIELD=keep-this\n`){
 const dir=await mkdtemp(join(tmpdir(),'next-step-integration-settings-'));const path=join(dir,'.env');await writeFile(path,source,{mode:0o600});t.after(()=>rm(dir,{recursive:true,force:true}));
 return {path,service:createDiscordIntegrationSettings({envFile:path,env:{},siteExists:id=>id==='demo-forum'||id==='wordpress'})};
}
test('settings GET reports configured secrets without returning any secret bytes',async t=>{
 const{service}=await fixture(t);const data=service.read();assert.equal(data.applicationId,appId);assert.equal(data.guildId,guildId);assert.equal(data.tokenConfigured,true);assert.equal(data.managedExternally,false);assert.equal(Object.hasOwn(data,'token'),false);assert.doesNotMatch(JSON.stringify(data),new RegExp(token));
});
test('blank token keeps the existing credential; writes are private and preserve unrelated configuration',async t=>{
 const{path,service}=await fixture(t);const data=await service.save({applicationId:appId,guildId,token:'',siteId:'wordpress',country:'NL'});assert.equal(data.tokenConfigured,true);assert.equal(data.siteId,'wordpress');assert.doesNotMatch(JSON.stringify(data),new RegExp(token));const source=await readFile(path,'utf8');assert.ok(source.includes(`DISCORD_BOT_TOKEN=${token}`));assert.ok(source.includes('# owner comment'));assert.ok(source.includes('UNCHANGED_FIELD=keep-this'));assert.equal((await stat(path)).mode&0o777,0o600);
});
test('invalid credentials, unknown sites and newline injection leave the prior environment untouched',async t=>{
 const{path,service}=await fixture(t);const original=await readFile(path,'utf8');for(const body of [{token:'short'},{applicationId:'not-an-id'},{guildId:'x\nLEAK=value'},{siteId:'unknown-platform'},{publicOrigin:'javascript:alert(1)'},{unsupported:token}]){
  await assert.rejects(service.save(body),error=>{assert.doesNotMatch(error.message,new RegExp(token));return error.status===400;});assert.equal(await readFile(path,'utf8'),original);
 }
});
test('first configuration requires a token and preserves no credential in its response',async t=>{
 const{path}=await fixture(t,'# fresh install\n');const service=createDiscordIntegrationSettings({envFile:path,env:{}});await assert.rejects(service.save({applicationId:appId,guildId,token:''}),/valid bot token/);const saved=await service.save({applicationId:appId,guildId,token,apiOrigin:'http://127.0.0.1:3000',publicOrigin:'https://support.example',country:'NL'});assert.equal(saved.tokenConfigured,true);assert.doesNotMatch(JSON.stringify(saved),new RegExp(token));
});
test('duplicate environment keys cannot silently restore the previous token after a save',async t=>{
 const{path,service}=await fixture(t,`DISCORD_APPLICATION_ID=${appId}\nDISCORD_TEST_GUILD_ID=${guildId}\nDISCORD_BOT_TOKEN=${token}\nDISCORD_BOT_TOKEN=ANOTHER_SYNTHETIC_OLD_SECRET\n`);const replacement='SYNTHETIC_REPLACEMENT_CREDENTIAL_VALUE';await service.save({token:replacement});const source=await readFile(path,'utf8');assert.equal(source.split('\n').filter(line=>line===`DISCORD_BOT_TOKEN=${replacement}`).length,2);assert.ok(!source.includes('ANOTHER_SYNTHETIC_OLD_SECRET'));
});
test('concurrent partial configuration saves serialize without losing unrelated updates',async t=>{
 const{service}=await fixture(t);await Promise.all([service.save({country:'UNKNOWN'}),service.save({publicOrigin:'https://support.example'})]);const data=service.read();assert.equal(data.country,'UNKNOWN');assert.equal(data.publicOrigin,'https://support.example');
});
test('externally managed settings cannot appear saved while process environment overrides them',async t=>{
 const{path}=await fixture(t);const service=createDiscordIntegrationSettings({envFile:path,env:{DISCORD_APPLICATION_ID:appId}});assert.equal(service.read().managedExternally,true);await assert.rejects(service.save({applicationId:'345678901234567890'}),error=>error.status===409&&error.code==='environment_managed');
});
test('OAuth client secret stays server-only and blank saves preserve it; callback URLs are constrained',async t=>{
 const{path,service}=await fixture(t);const secret='SYNTHETIC_OAUTH_SECRET_FOR_SETTINGS_TEST';await service.save({clientSecret:secret,redirectUri:'http://localhost:3000/api/moderator/integrations/discord/oauth/callback'});const data=await service.save({clientSecret:''});assert.equal(data.clientSecretConfigured,true);assert.doesNotMatch(JSON.stringify(data),new RegExp(secret));assert.ok((await readFile(path,'utf8')).includes('DISCORD_CLIENT_SECRET='+secret));for(const redirectUri of ['javascript:alert(1)','https://evil.example/arbitrary-redirect','http://public.example/api/moderator/integrations/discord/oauth/callback'])await assert.rejects(service.save({redirectUri}),error=>error.status===400);
});
