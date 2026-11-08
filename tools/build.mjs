import { build } from 'esbuild';
import { mkdir,cp,readdir,rename,readFile,writeFile,rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve,basename } from 'node:path';
execFileSync(process.execPath,['node_modules/vite/bin/vite.js','build'],{stdio:'inherit'});
await mkdir('dist/embed',{recursive:true});await mkdir('dist/downloads',{recursive:true});
await build({entryPoints:['packages/browser/src/index.js'],outfile:'dist/embed/before.js',bundle:true,format:'iife',target:'es2020',minify:true});
for(const name of ['browser','react']){
 const dir=`packages/${name}`;await mkdir(`${dir}/dist`,{recursive:true});
 await build({entryPoints:[`${dir}/src/index.js`],outfile:`${dir}/dist/index.js`,bundle:true,format:'esm',platform:'browser',target:'es2020',external:name==='react'?['react']:[]});
 await cp(`${dir}/src/index.d.ts`,`${dir}/dist/index.d.ts`);
 const output=JSON.parse(execFileSync('npm',['pack',`./${dir}`,'--json','--pack-destination',resolve('dist/downloads')],{encoding:'utf8'}));
 await rename(`dist/downloads/${output[0].filename}`,`dist/downloads/before-${name}.tgz`);
}
async function zipFolder(source,name,folder){
 try{await readdir(source);}catch{return;}
 const stage=resolve(`.before/build/${name}`);await rm(stage,{recursive:true,force:true});await mkdir(`${stage}/${folder}`,{recursive:true});
 await cp(source,`${stage}/${folder}`,{recursive:true,filter:path=>!path.includes('node_modules')&&!(basename(path).startsWith('.env')&&basename(path)!=='.env.example')});
 execFileSync('zip',['-qr',resolve(`dist/downloads/before-${name}.zip`),folder],{cwd:stage});
}
await zipFolder('integrations/wordpress-plugin','wordpress','before-prevention');
await zipFolder('integrations/discord','discord','before-discord');
for(const name of ['ui-clarity','ui-revision','message-builder','integrations','research-lab']){try { await cp(`artifacts/${name}`,`dist/review/${name}`,{recursive:true}); } catch (error) { if(error.code!=='ENOENT') throw error; }}
console.log('Built application, standalone browser script, SDK packages and available integration ZIPs.');
