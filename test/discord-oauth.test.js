import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import http from 'node:http';
import { once } from 'node:events';
import { createHash } from 'node:crypto';
import { createDiscordOAuth } from '../server/discord-oauth.js';
const base='/api/moderator/integrations/discord/oauth';
const clientSecret='SYNTHETIC_OAUTH_CLIENT_SECRET_VALUE';
const accessToken='SYNTHETIC_OAUTH_ACCESS_TOKEN_VALUE';
const refreshToken='SYNTHETIC_REFRESH_TOKEN_NOT_STORED';
const profileId='345678901234567890';
const defaultConfig={applicationId:'123456789012345678',clientSecret,redirectUri:`http://localhost:3000${base}/callback`};
function cookie(response,name){const rows=response.headers.getSetCookie();return rows.find(row=>row.startsWith(name+'='))?.split(';')[0]||'';}
async function fixture(t,{configured=true,fetcher,timeout=100}={}){
 let config=configured?{...defaultConfig}:{applicationId:defaultConfig.applicationId},time=1000000;
 const requests=[];
 const provider=fetcher||(async(url,options={})=>{
  requests.push({url,options});
  if(url.endsWith('/token'))return{ok:true,json:async()=>({access_token:accessToken,refresh_token:refreshToken,token_type:'Bearer',scope:'identify guilds',expires_in:3600})};
  if(url.endsWith('/users/@me'))return{ok:true,json:async()=>({id:profileId,username:'owner',global_name:'Community owner',email:'NOT_REQUESTED_OR_RETAINED'})};
  if(url.includes('/users/@me/guilds'))return{ok:true,json:async()=>[
   {id:'456789012345678901',name:'Owned',owner:true,permissions:'0'},
   {id:'567890123456789012',name:'Managed',owner:false,permissions:'32'},
   {id:'678901234567890123',name:'Administrator',owner:false,permissions:'8'},
   {id:'789012345678901234',name:'Ordinary member',owner:false,permissions:'0'},
   {id:'890123456789012345',name:'Malformed permissions',owner:false,permissions:'bad'},
  ]};
  if(url.endsWith('/revoke'))return{ok:true};
  throw Error('Unexpected synthetic request');
 });
 const oauth=createDiscordOAuth({configReader:()=>config,now:()=>time,fetcher:provider,requestTimeoutMs:timeout});
 const app=express();app.use(express.json());app.use(base,oauth.router);app.use((error,_req,res,_next)=>res.status(error.status||500).json({error:'Invalid operation',code:error.code||'failed'}));
 const server=http.createServer(app);server.listen(0,'127.0.0.1');await once(server,'listening');
 t.after(async()=>{oauth.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));});
 const origin=`http://127.0.0.1:${server.address().port}`;
 const call=(path,{cookies='',method='GET',body}={})=>fetch(origin+base+path,{method,redirect:'manual',headers:{...(cookies?{Cookie:cookies}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
 const start=async()=>{const response=await call('/start');return{response,url:new URL(response.headers.get('location')),cookies:cookie(response,'next_step_discord_state')};};
 const complete=async started=>call(`/callback?state=${started.url.searchParams.get('state')}&code=synthetic-code`,{cookies:started.cookies});
 return{call,start,complete,requests,config:value=>{config=value;},advance:milliseconds=>{time+=milliseconds;}};
}
test('unconfigured account OAuth is honest and makes no Discord call',async t=>{
 const f=await fixture(t,{configured:false});const status=await(await f.call('/status')).json();assert.deepEqual(status,{configured:false,connected:false,user:null,guilds:[],authorizeUrl:base+'/start'});const response=await f.call('/start');assert.equal(response.status,409);assert.equal(f.requests.length,0);assert.doesNotMatch(await response.text(),new RegExp(clientSecret));
});
test('authorization uses identify/guilds, one-time state and PKCE without browser secrets',async t=>{
 const f=await fixture(t);const started=await f.start();assert.equal(started.response.status,302);assert.equal(started.url.origin,'https://discord.com');assert.equal(started.url.searchParams.get('response_type'),'code');assert.equal(started.url.searchParams.get('scope'),'identify guilds');assert.equal(started.url.searchParams.get('code_challenge_method'),'S256');assert.ok(started.url.searchParams.get('code_challenge'));assert.match(started.response.headers.get('set-cookie'),/HttpOnly/);assert.match(started.response.headers.get('set-cookie'),/SameSite=Lax/);assert.doesNotMatch(started.url.href,new RegExp(clientSecret+'|'+accessToken));
 const callback=await f.complete(started);assert.equal(callback.status,303);assert.equal(callback.headers.get('location'),'/moderator/docs/discord?discord_auth=connected');const exchange=f.requests.find(request=>request.url.endsWith('/token'));const body=new URLSearchParams(exchange.options.body);assert.equal(body.get('grant_type'),'authorization_code');assert.equal(body.get('code'),'synthetic-code');assert.equal(createHash('sha256').update(body.get('code_verifier')).digest('base64url'),started.url.searchParams.get('code_challenge'));assert.equal(body.get('redirect_uri'),defaultConfig.redirectUri);assert.ok(exchange.options.headers.Authorization.startsWith('Basic '));assert.doesNotMatch(callback.headers.get('set-cookie'),new RegExp(accessToken+'|'+refreshToken));
});
test('account status retains only the account name and manageable servers, never tokens/email/member profiles',async t=>{
 const f=await fixture(t),started=await f.start(),callback=await f.complete(started),session=cookie(callback,'next_step_discord_account');const status=await(await f.call('/status',{cookies:session})).json();assert.equal(status.connected,true);assert.deepEqual(status.user,{id:profileId,username:'Community owner'});assert.deepEqual(status.guilds.map(guild=>guild.name),['Owned','Managed','Administrator']);assert.doesNotMatch(JSON.stringify(status),new RegExp(accessToken+'|'+refreshToken+'|'+clientSecret+'|NOT_REQUESTED_OR_RETAINED|permissions|Ordinary member'));
});
test('missing/mismatched state and Unicode cookie input cannot exchange a code or crash the callback',async t=>{
 const f=await fixture(t),started=await f.start();for(const cookies of ['',started.cookies.replace(/.$/,'x'),'next_step_discord_state='+encodeURIComponent('é'.repeat(43))]){const response=await f.call('/callback?state='+started.url.searchParams.get('state')+'&code=synthetic-code',{cookies});assert.equal(response.status,303);assert.equal(response.headers.get('location'),'/moderator/docs/discord?discord_auth=invalid_state');}assert.equal(f.requests.length,0);
});
test('state expires, is one-use, and is invalidated by host OAuth configuration changes',async t=>{
 const f=await fixture(t);let started=await f.start();f.advance(600001);let response=await f.complete(started);assert.match(response.headers.get('location'),/invalid_state$/);assert.equal(f.requests.length,0);started=await f.start();f.config({...defaultConfig,clientSecret:'SYNTHETIC_REPLACED_OAUTH_SECRET'});response=await f.complete(started);assert.match(response.headers.get('location'),/invalid_state$/);assert.equal(f.requests.length,0);f.config({...defaultConfig});started=await f.start();await f.complete(started);const count=f.requests.length;response=await f.complete(started);assert.match(response.headers.get('location'),/invalid_state$/);assert.equal(f.requests.length,count);
});
test('provider cancellation and errors do not become a connected account or expose diagnostics',async t=>{
 const f=await fixture(t);const started=await f.start();const cancelled=await f.call('/callback?state='+started.url.searchParams.get('state')+'&error=access_denied',{cookies:started.cookies});assert.match(cancelled.headers.get('location'),/cancelled$/);assert.equal(f.requests.length,0);
 const broken=await fixture(t,{fetcher:async()=>{throw Error(clientSecret+' '+accessToken);}});const attempt=await broken.start(),failed=await broken.complete(attempt);assert.match(failed.headers.get('location'),/failed$/);assert.doesNotMatch(await failed.text(),new RegExp(clientSecret+'|'+accessToken));assert.equal((await(await broken.call('/status')).json()).connected,false);
});
test('account sessions expire and disconnect clears local authorization even when provider revocation is unavailable',async t=>{
 const f=await fixture(t),started=await f.start(),callback=await f.complete(started),session=cookie(callback,'next_step_discord_account');let response=await f.call('/disconnect',{cookies:session,method:'POST',body:{}});assert.equal(response.status,200);assert.equal((await(await f.call('/status',{cookies:session})).json()).connected,false);assert.equal(f.requests.filter(request=>request.url.endsWith('/revoke')).length,1);
 const again=await f.start(),againCallback=await f.complete(again),againSession=cookie(againCallback,'next_step_discord_account');f.advance(3600001);assert.equal((await(await f.call('/status',{cookies:againSession})).json()).connected,false);response=await f.call('/disconnect',{cookies:againSession,method:'POST',body:{token:accessToken}});assert.equal(response.status,400);
});
