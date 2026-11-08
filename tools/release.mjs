import{execFileSync}from'node:child_process';import{mkdir,readFile,writeFile,readdir,cp,rm}from'node:fs/promises';import{createHash}from'node:crypto';import{resolve,basename}from'node:path';
await mkdir('release',{recursive:true});
const files=['embed/before.js',...(await readdir('dist/downloads')).map(name=>`downloads/${name}`)];
const artifacts=[];for(const file of files){const bytes=await readFile(`dist/${file}`);artifacts.push({path:`dist/${file}`,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}
await writeFile('release/manifest.json',JSON.stringify({product:'Next Step',version:'0.2.0',scope:'local technical demonstration',createdAt:new Date().toISOString(),artifacts,discordConnection:'requires locally supplied credentials; see verification report',languages:{complete:['nl','en'],preview:['de','fr','es','it','pl','pt']}},null,2));
const stage=resolve('.before/release-stage');
await rm(stage,{recursive:true,force:true});await mkdir(stage,{recursive:true});
const sources=['dist','artifacts','packages','integrations','docs','core','content','gateway','server','app','public','tools','test','qa','data','contract','demo','intervention','embed','mock-platform','starter-widget','starter-backend','package.json','package-lock.json','vite.config.js','vite-dashboard.config.js','playwright.config.js','index.html','README.md','DESIGN.md','SAFETY.md','BRIEF.md','LICENSE','.gitignore'];
const filter=path=>{const name=basename(path);return !['node_modules','.before','.git'].includes(name)&&!name.endsWith('.log')&&!(name.startsWith('.env')&&name!=='.env.example');};
for(const source of sources)await cp(source,resolve(stage,source),{recursive:true,filter});
await mkdir(resolve(stage,'release'));await cp('release/manifest.json',resolve(stage,'release/manifest.json'));
await rm('release/before-demo.zip',{force:true});
execFileSync('zip',['-qr',resolve('release/before-demo.zip'),'.'],{cwd:stage,stdio:'inherit'});
console.log('Technical release: release/before-demo.zip');
