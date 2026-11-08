import express from 'express';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { readEnvFile } from '../integrations/discord/config.js';
import { exact } from './validation.js';

const basePath='/api/moderator/integrations/discord/oauth';
const defaultEnvFile=fileURLToPath(new URL('../integrations/discord/.env',import.meta.url));
const snowflake=value=>typeof value==='string'&&/^\d{17,22}$/.test(value);
const cookieValue=(req,name)=>{const part=(req.get('cookie')||'').split(';').map(value=>value.trim()).find(value=>value.startsWith(name+'='));return part?part.slice(name.length+1):null;};
const equal=(left,right)=>{if(typeof left!=='string'||typeof right!=='string')return false;const a=Buffer.from(left),b=Buffer.from(right);return a.length===b.length&&timingSafeEqual(a,b);};
const fingerprint=config=>createHash('sha256').update(JSON.stringify(config)).digest('hex');
const manageable=guild=>{try{return guild.owner===true||(BigInt(guild.permissions||'0')&40n)!==0n;}catch{return false;}};

// Account authorization is separate from bot installation. Mount this router
// behind the moderator session, private gateway and origin middleware.
export function createDiscordOAuth({envFile=defaultEnvFile,env=process.env,frontendOrigin='http://localhost:3000',fetcher=fetch,now=Date.now,configReader,requestTimeoutMs=7000,maxPending=100,maxSessions=100}={}){
 const router=express.Router(),pending=new Map(),sessions=new Map();
 const stateCookie='next_step_discord_state',sessionCookie='next_step_discord_account';
 let closed=false;
 const cleanup=setInterval(()=>prune(),60000);cleanup.unref?.();
 function configuration(){
  let values;
  try{values=configReader?configReader():{...readEnvFile(envFile),...env};}catch{return null;}
  const applicationId=values.applicationId||values.DISCORD_APPLICATION_ID,clientSecret=values.clientSecret||values.DISCORD_CLIENT_SECRET;
  const redirectUri=values.redirectUri||values.DISCORD_OAUTH_REDIRECT_URI||`${frontendOrigin}${basePath}/callback`;
  try{const uri=new URL(redirectUri);if(!snowflake(applicationId)||typeof clientSecret!=='string'||clientSecret.length<24||clientSecret.length>512||/[\s\r\n]/.test(clientSecret)||/^(YOUR_|REPLACE|PASTE|CHANGE|example)/i.test(clientSecret)||uri.username||uri.password||uri.search||uri.hash||uri.pathname!==`${basePath}/callback`||uri.protocol!=='https:'&&!(uri.protocol==='http:'&&['localhost','127.0.0.1'].includes(uri.hostname)))return null;}catch{return null;}
  return {applicationId,clientSecret,redirectUri};
 }
 function prune(){for(const[key,value]of pending)if(value.expiresAt<=now())pending.delete(key);for(const[key,value]of sessions)if(value.expiresAt<=now())sessions.delete(key);}
 function cookieOptions(config,maxAge){return {httpOnly:true,sameSite:'lax',secure:new URL(config?.redirectUri||frontendOrigin).protocol==='https:',path:basePath,maxAge};}
 function clearCookie(res,name,config){res.clearCookie(name,{...cookieOptions(config,0),maxAge:undefined});}
 function publicStatus(req){
  prune();const config=configuration(),id=cookieValue(req,sessionCookie),session=id?sessions.get(id):null;
  const valid=Boolean(config&&session&&session.fingerprint===fingerprint(config));
  if(session&&!valid)sessions.delete(id);
  return {configured:Boolean(config),connected:valid,user:valid?session.user:null,guilds:valid?session.guilds:[],authorizeUrl:`${basePath}/start`};
 }
 async function request(url,options={}){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),requestTimeoutMs);
  try{const response=await fetcher(url,{...options,signal:controller.signal,redirect:'error',referrerPolicy:'no-referrer'});if(!response.ok)throw Error('provider_unavailable');return await response.json();}finally{clearTimeout(timer);}
 }
 async function revoke(session){
  if(!session?.accessToken)return;
  const config=configuration();if(!config||session.applicationId!==config.applicationId)return;
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),Math.min(requestTimeoutMs,2000));
  try{await fetcher('https://discord.com/api/oauth2/token/revoke',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded',Authorization:`Basic ${Buffer.from(`${config.applicationId}:${config.clientSecret}`).toString('base64')}`},body:new URLSearchParams({token:session.accessToken,token_type_hint:'access_token'}),signal:controller.signal,redirect:'error',referrerPolicy:'no-referrer'});}catch{/* Local disconnection always clears the in-memory authorization. */}finally{clearTimeout(timer);}
 }
 function returnToDashboard(res,result){res.redirect(303,`/moderator/docs/discord?discord_auth=${result}`);}
 router.use((_req,res,next)=>{res.set('Cache-Control','no-store');res.set('Referrer-Policy','no-referrer');next();});
 router.get('/status',(req,res)=>res.json(publicStatus(req)));
 router.get('/start',(req,res)=>{
  if(closed)return res.status(503).json({error:'Discord account authorization is unavailable.',code:'oauth_unavailable'});
  const config=configuration();if(!config)return res.status(409).json({error:'Configure the OAuth client secret and registered callback URL before account sign-in.',code:'oauth_not_configured'});
  prune();if(pending.size>=maxPending)return res.status(429).json({error:'Too many sign-in attempts are pending. Try again shortly.',code:'oauth_busy'});
  const previous=cookieValue(req,stateCookie);if(previous)pending.delete(previous);
  const state=randomBytes(32).toString('base64url'),verifier=randomBytes(48).toString('base64url');
  pending.set(state,{verifier,expiresAt:now()+600000,fingerprint:fingerprint(config)});
  res.cookie(stateCookie,state,cookieOptions(config,600000));
  const url=new URL('https://discord.com/oauth2/authorize');
  for(const[key,value]of Object.entries({client_id:config.applicationId,response_type:'code',redirect_uri:config.redirectUri,scope:'identify guilds',state,code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256'}))url.searchParams.set(key,value);
  res.redirect(302,url.href);
 });
 router.get('/callback',async(req,res)=>{
  const config=configuration(),state=typeof req.query.state==='string'?req.query.state:null,cookie=cookieValue(req,stateCookie),attempt=state?pending.get(state):null;
  clearCookie(res,stateCookie,config);
  if(!config||!state||!equal(state,cookie)||!attempt||attempt.expiresAt<=now()||attempt.fingerprint!==fingerprint(config))return returnToDashboard(res,'invalid_state');
  pending.delete(state);
  if(req.query.error)return returnToDashboard(res,'cancelled');
  const code=typeof req.query.code==='string'?req.query.code:null;if(!code||code.length>4096||/[\r\n]/.test(code))return returnToDashboard(res,'failed');
  let accessToken=null;
  try{
   const tokens=await request('https://discord.com/api/oauth2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded',Authorization:`Basic ${Buffer.from(`${config.applicationId}:${config.clientSecret}`).toString('base64')}`},body:new URLSearchParams({grant_type:'authorization_code',code,redirect_uri:config.redirectUri,code_verifier:attempt.verifier})});
   accessToken=tokens.access_token;
   const granted=new Set(String(tokens.scope||'').split(' '));
   if(typeof accessToken!=='string'||accessToken.length<8||accessToken.length>4096||/[\r\n]/.test(accessToken)||String(tokens.token_type).toLowerCase()!=='bearer'||!granted.has('identify')||!granted.has('guilds'))throw Error('invalid_token_response');
   const headers={Authorization:`Bearer ${accessToken}`};
   const [profile,guildList]=await Promise.all([request('https://discord.com/api/v10/users/@me',{headers}),request('https://discord.com/api/v10/users/@me/guilds?limit=200',{headers})]);
   if(!snowflake(profile.id)||typeof profile.username!=='string'||!Array.isArray(guildList)||closed)throw Error('invalid_account_response');
   const user={id:profile.id,username:String(profile.global_name||profile.username).slice(0,100)};
   const guilds=guildList.filter(guild=>snowflake(guild.id)&&typeof guild.name==='string'&&manageable(guild)).slice(0,200).map(guild=>({id:guild.id,name:guild.name.slice(0,100)}));
   const oldId=cookieValue(req,sessionCookie),old=oldId?sessions.get(oldId):null;if(oldId)sessions.delete(oldId);if(old)void revoke(old);
   prune();if(sessions.size>=maxSessions)sessions.delete(sessions.keys().next().value);
   const id=randomBytes(32).toString('base64url'),duration=Math.min(Math.max(Number(tokens.expires_in)||3600,1),3600)*1000;
   sessions.set(id,{user,guilds,accessToken,applicationId:config.applicationId,fingerprint:fingerprint(config),expiresAt:now()+duration});
   res.cookie(sessionCookie,id,cookieOptions(config,duration));
   returnToDashboard(res,'connected');
  }catch{
   if(accessToken)void revoke({accessToken,applicationId:config.applicationId});
   returnToDashboard(res,'failed');
  }
 });
 router.post('/disconnect',async(req,res,next)=>{
  try{exact(req.body||{},[]);const id=cookieValue(req,sessionCookie),session=id?sessions.get(id):null;if(id)sessions.delete(id);clearCookie(res,sessionCookie,configuration());await revoke(session);res.json({ok:true});}catch(error){next(error);}
 });
 return {router,close(){closed=true;clearInterval(cleanup);pending.clear();sessions.clear();}};
}
