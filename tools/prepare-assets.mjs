import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { CATALOGUE } from '../content/catalogue.js';
const target=new URL('../public/brands/',import.meta.url); await mkdir(target,{recursive:true});
const records=[];
await Promise.all(CATALOGUE.map(async item=>{
  try {
    const controller=AbortSignal.timeout(15000);
    const page=await fetch(item.website,{signal:controller}); const html=await page.text();
    const tags=html.match(/<link\b[^>]*>/gi)||[];
    let href;
    for(const tag of tags){if(/rel\s*=\s*["'][^"']*icon/i.test(tag)){const found=tag.match(/href\s*=\s*["']([^"']+)/i);if(found && !found[1].startsWith('data:')){href=new URL(found[1],page.url).href; if(/favicon\.ico/.test(href))break;}}}
    href ||= new URL('/favicon.ico',item.website).href;
    const response=await fetch(href,{signal:AbortSignal.timeout(12000)});
    if(!response.ok||!response.headers.get('content-type')?.includes('image'))throw new Error('No icon');
    const data=Buffer.from(await response.arrayBuffer());if(data.length>500000||data.length<16)throw new Error('Invalid icon');
    await writeFile(new URL(`${item.id}.ico`,target),data);
    records.push({id:item.id,source:href,retrieved:'2026-11-07',usage:'Official site favicon for identification; no endorsement. Provider brand rights remain with owner.'});
  } catch {
    // Static locally generated fallback; no runtime vendor request.
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#e8eee6"/><text x="32" y="43" text-anchor="middle" font-family="Georgia,serif" font-size="39" fill="#244d3d">${item.name[0]}</text></svg>`;
    await writeFile(new URL(`${item.id}.ico`,target),svg);records.push({id:item.id,source:null,usage:'Original generated monogram fallback'});
  }
}));
await writeFile(new URL('provenance.json',target),JSON.stringify(records.sort((a,b)=>a.id.localeCompare(b.id)),null,2));
console.log(`Bundled ${records.filter(x=>x.source).length} official icons and ${records.filter(x=>!x.source).length} local fallbacks.`);
