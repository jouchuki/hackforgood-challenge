import {mkdir,writeFile}from'node:fs/promises';import{gunzipSync}from'node:zlib';
await mkdir('.before',{recursive:true});
try{
 const page=await(await fetch('https://db-ip.com/db/download/ip-to-country-lite',{signal:AbortSignal.timeout(15000)})).text();
 const match=page.match(/href=["']([^"']*dbip-country-lite-[^"']*\.mmdb\.gz)["']/);
 if(!match)throw new Error('Database link unavailable');
 const url=new URL(match[1],'https://db-ip.com').href;
 const response=await fetch(url,{signal:AbortSignal.timeout(90000)});if(!response.ok)throw new Error('Country download failed');
 await writeFile('.before/country.mmdb',gunzipSync(Buffer.from(await response.arrayBuffer())));
 await writeFile('.before/country-source.json',JSON.stringify({source:url,provider:'DB-IP Lite',license:'CC BY 4.0',attribution:'https://db-ip.com',downloadedAt:new Date().toISOString()}));
 console.log('Local country database ready. IPs are never sent to the database provider.');
}catch{console.log('Country database unavailable. Manual country selection remains available.');}
console.log('Brand assets are bundled. Use npm run demo:wordpress once online to cache the local WordPress runtime.');
