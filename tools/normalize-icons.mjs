import{chromium}from'@playwright/test';import{readFile,writeFile}from'node:fs/promises';import{existsSync}from'node:fs';import{CATALOGUE}from'../content/catalogue.js';
const browser=await chromium.launch({headless:true,...(existsSync('/usr/bin/google-chrome')?{executablePath:'/usr/bin/google-chrome'}:{}),args:['--no-sandbox']});const page=await browser.newPage();
for(const item of CATALOGUE){
 const bytes=await readFile(`public/brands/${item.id}.ico`);const text=bytes.toString('utf8',0,200);const mime=text.includes('<svg')||text.startsWith('<?xml')?'image/svg+xml':bytes[0]===137?'image/png':bytes[0]===255?'image/jpeg':'image/x-icon';
 const png=await page.evaluate(async({url,letter})=>{const canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;const context=canvas.getContext('2d');try{const img=new Image();img.src=url;await img.decode();context.drawImage(img,0,0,64,64);}catch{context.fillStyle='#e8eee6';context.fillRect(0,0,64,64);context.fillStyle='#244d3d';context.font='39px Georgia';context.textAlign='center';context.fillText(letter,32,44);}return canvas.toDataURL('image/png').split(',')[1];},{url:`data:${mime};base64,${bytes.toString('base64')}`,letter:item.name[0]});
 await writeFile(`public/brands/${item.id}.png`,Buffer.from(png,'base64'));
}
await browser.close();console.log(`Normalised ${CATALOGUE.length} local catalogue icons.`);
