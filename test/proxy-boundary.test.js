import test from 'node:test';import assert from'node:assert/strict';import http from'node:http';import{createGateway}from'../gateway/proxy.js';
const request=(port,path)=>new Promise((resolve,reject)=>{const req=http.request({hostname:'127.0.0.1',port,path,headers:{host:'example.onion'}},res=>{res.resume();res.on('end',()=>resolve({status:res.statusCode,headers:res.headers}));});req.on('error',reject);req.end();});
test('onion host cannot expose local administration or launchpad',async()=>{
 let lookups=0;const server=await createGateway({gatewayKey:'isolated-test-infrastructure-key',countryReader:()=>{lookups++;return'NL';}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{const port=server.address().port;for(const path of ['/moderator/overview','/researcher/studies','/api/session','/api/moderator/sites','/api/presenter/reset','/demo/control']){const response=await request(port,path);assert.equal(response.status,404);}
 const response=await request(port,'/');assert.equal(response.status,302);assert.equal(response.headers.location,'/help');assert.equal(lookups,0);
 }finally{await new Promise(r=>server.close(r));}
});

test('public deployment protects every owner API while leaving visitor routes open',async()=>{
 const password='deployment-test-password',received=[];
 const upstream=http.createServer((req,res)=>{received.push(req.headers);res.end('public content');});
 await new Promise(r=>upstream.listen(0,'127.0.0.1',r));
 const server=await createGateway({gatewayKey:'isolated-test-infrastructure-key',mode:'production',apiPort:upstream.address().port,adminPassword:password});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const url=`http://127.0.0.1:${server.address().port}`;
 const authorization=`Basic ${Buffer.from(`admin:${password}`).toString('base64')}`;
 try{
  for(const path of ['/moderator/overview','/researcher/studies','/api/session','/api/moderator/integrations/discord/config','/api/researcher/posthog/config','/api/presenter/reset','/demo/control']){
   const blocked=await fetch(url+path,{method:path.startsWith('/api/')?'POST':'GET'});
   assert.equal(blocked.status,401,path);assert.match(blocked.headers.get('www-authenticate'),/^Basic /);
   assert.equal((await fetch(url+path,{headers:{authorization:'Basic aW52YWxpZA=='}})).status,401);
   assert.equal((await fetch(url+path,{headers:{authorization}})).status,200);
  }
  for(const path of ['/','/demo/forum','/help','/intervention/demo-forum','/embed/before.js','/api/public/sites/demo-forum/config','/api/health'])assert.equal((await fetch(url+path)).status,200,path);
  assert.ok(received.every(headers=>!headers.authorization),'Owner password never reaches the application API');
 }finally{await new Promise(r=>server.close(r));await new Promise(r=>upstream.close(r));}
});
