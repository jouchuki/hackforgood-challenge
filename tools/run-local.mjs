import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
const production=process.argv.includes('--production');
const cwd=resolve(new URL('..',import.meta.url).pathname);
process.chdir(cwd);
const env={...process.env,BEFORE_GATEWAY_KEY:randomBytes(32).toString('hex'),BEFORE_MODE:production?'production':'development',BEFORE_STORE_PATH:resolve('.before/state.json')};
const children=[];
function launch(file,args=[],extra={}){const child=spawn(process.execPath,[file,...args],{cwd,env:{...env,...extra},stdio:'inherit'});children.push(child);child.on('exit',code=>{if(code && !stopping){console.error('A local service stopped; check the safe diagnostics above.');stop(code);}});return child;}
let stopping=false;
function stop(code=0){if(stopping)return;stopping=true;for(const child of children)child.kill('SIGTERM');setTimeout(()=>process.exit(code),400).unref();}
process.on('SIGINT',()=>stop());process.on('SIGTERM',()=>stop());
if(!production){
  const {build}=await import('esbuild');
  await build({entryPoints:['packages/browser/src/index.js'],bundle:true,format:'iife',target:'es2020',minify:true,outfile:'dist/embed/before.js'});
  launch('node_modules/vite/bin/vite.js',['--host','127.0.0.1','--port','3002','--strictPort']);
}
launch('server/api.js',[],{PORT:'3001'});
launch('gateway/proxy.js',[],{PORT:'3000'});
let ready=false;
for(let attempt=0;attempt<60;attempt++){
  try{const response=await fetch('http://localhost:3000/api/health');if(response.ok){ready=true;break;}}catch{}
  await new Promise(r=>setTimeout(r,250));
}
if(!ready){console.error('Local services did not become ready.');stop(1);}else{
  console.log('\nNext Step is ready: http://localhost:3000/\nModerator: http://localhost:3000/moderator/overview\nResearcher: http://localhost:3000/researcher/studies\nDemo: http://localhost:3000/demo/forum\nHelp without JavaScript: http://localhost:3000/help\n');
}
