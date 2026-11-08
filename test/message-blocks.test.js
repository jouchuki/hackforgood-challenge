import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import http from 'node:http';
import {once} from 'node:events';
import {DEFAULT_INTERVENTION,newStudy} from '../core/model.js';
import {BLOCK_TYPES,MESSAGE_STAGES,MAX_BLOCKS_PER_STAGE,createMessageBlock,stageBlocks,blockPlainText} from '../core/message-blocks.js';
import {MODERATION_TEMPLATES,moderationTemplate,experiencePreset} from '../core/presets.js';
import {intervention} from '../server/validation.js';
import {renderMessageBlocks} from '../app/message-blocks-view.js';
import {createApp} from '../server/app.js';

const emptyBlocks=()=>({reflection:[],education:[],support:[]});
const withBlock=()=>({...structuredClone(DEFAULT_INTERVENTION),blocks:{...emptyBlocks(),education:[{id:'education-example',type:'text',en:'A useful extra paragraph.',nl:'Een nuttige extra alinea.'}]}});

test('content factories produce unique author IDs and complete bilingual editable defaults',()=>{
 const ids=new Set();
 for(const type of BLOCK_TYPES){const block=createMessageBlock(type);assert.equal(block.type,type);assert.match(block.id,/^[A-Za-z0-9_-]{1,64}$/);assert.ok(!ids.has(block.id));ids.add(block.id);if(type!=='divider')assert.ok(block.en.trim()&&block.nl.trim());else assert.equal(block.en+block.nl,'');const value={...structuredClone(DEFAULT_INTERVENTION),blocks:{...emptyBlocks(),reflection:[block]}};assert.deepEqual(intervention(value),value);}
 assert.throws(()=>createMessageBlock('html'));
 assert.ok(!ids.has(createMessageBlock('text').id));
});

test('six complete templates have different formats and initial messages without mutating legacy defaults',()=>{
 const baseline=JSON.stringify(DEFAULT_INTERVENTION);const formats=new Set(),headlines=new Set();
 assert.equal(MODERATION_TEMPLATES.length,6);
 for(const meta of MODERATION_TEMPLATES){const value=moderationTemplate(meta.id);assert.deepEqual(intervention(value),value);formats.add([value.layout,value.appearance,value.order.join(',')].join('|'));const first=value.order[0]==='education'?'educationTitle':'title';headlines.add(value.en[first]);assert.ok(meta.name.en&&meta.name.nl&&meta.description.en&&meta.description.nl);assert.ok(value.en[first]&&value.nl[first]);assert.deepEqual(Object.keys(value.blocks),MESSAGE_STAGES);for(const stage of MESSAGE_STAGES)assert.ok(value.blocks[stage].length<=MAX_BLOCKS_PER_STAGE);}
 assert.equal(formats.size,6);assert.equal(headlines.size,6);assert.equal(JSON.stringify(DEFAULT_INTERVENTION),baseline);
 const first=moderationTemplate('meaning');first.blocks.reflection[0].en='A later edit';assert.notEqual(moderationTemplate('meaning').blocks.reflection[0].en,'A later edit');
 const old=experiencePreset('calm');assert.equal(old.blocks,undefined);assert.equal(old.appearance,undefined);
 assert.equal(moderationTemplate('quick-help').legal,false);assert.equal(moderationTemplate('guided').motion.enabled,true);
 assert.throws(()=>moderationTemplate('unknown'));
});

test('block validation bounds structure, types, author IDs and both language versions',()=>{
 const mutate=fn=>{const value=withBlock();fn(value);return()=>intervention(value);};
 for(const failure of [
  mutate(value=>value.blocks.education[0].type='html'),
  mutate(value=>value.blocks.education[0].html='<script>unsafe()</script>'),
  mutate(value=>delete value.blocks.education[0].nl),
  mutate(value=>value.blocks.education[0].nl=' '),
  mutate(value=>value.blocks.education[0].en='a'.repeat(601)),
  mutate(value=>value.blocks.education[0].id='bad" onclick="unsafe()'),
  mutate(value=>value.blocks.reflection.push({...value.blocks.education[0]})),
  mutate(value=>delete value.blocks.support),
  mutate(value=>value.blocks.extra=[]),
  mutate(value=>value.blocks.education=Array.from({length:7},(_,i)=>({...value.blocks.education[0],id:'block-'+i}))),
  mutate(value=>value.appearance='url(https://untrusted.example)'),
 ])assert.throws(failure,error=>error.status===400);
 const old=structuredClone(DEFAULT_INTERVENTION);assert.deepEqual(intervention(old),old);
});

test('delivered blocks are escaped, ordered and language-specific with no visitor edit affordance',()=>{
 const value=withBlock();value.blocks.education=[
  {id:'extra-list',type:'list',en:'<img src=x onerror=unsafe()>\nA second choice',nl:'Eerste keuze\nTweede keuze'},
  {id:'extra-quote',type:'quote',en:'A <script>literal</script> question.',nl:'Een eigen vraag.'},
  {id:'extra-divider',type:'divider',en:'',nl:''},
 ];
 const html=renderMessageBlocks(value,'education','en');assert.match(html,/&lt;img/);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<img|<script|role="button"|tabindex=/);assert.equal((html.match(/<li>/g)||[]).length,2);assert.ok(html.indexOf('extra-list')<html.indexOf('extra-quote'));assert.match(html,/data-message-stage="education"/);assert.match(html,/<hr>/);
 const nl=renderMessageBlocks(value,'education','nl');assert.match(nl,/Eerste keuze/);assert.doesNotMatch(nl,/second choice/);
 const editable=renderMessageBlocks(value,'education','en',{editable:true});assert.match(editable,/role="button" tabindex="0"/);assert.match(editable,/aria-label="Edit List"/);
 assert.equal(stageBlocks(value,'unknown').length,0);assert.equal(blockPlainText(value,'education','nl'),'Eerste keuze\nTweede keuze\n\nEen eigen vraag.');
 assert.equal(renderMessageBlocks(DEFAULT_INTERVENTION,'education'),'');
});

test('published block content remains immutable in moderator and research snapshots',async t=>{
 const directory=await mkdtemp(join(tmpdir(),'next-step-blocks-'));const gatewayKey='synthetic-block-test-gateway';
 const app=createApp({storePath:join(directory,'state.json'),gatewayKey});const server=http.createServer(app);server.listen(0,'127.0.0.1');await once(server,'listening');
 t.after(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));await rm(directory,{recursive:true,force:true});});
 const base=`http://127.0.0.1:${server.address().port}`;const sessions={};
 const call=async(path,{method='GET',body,role}={})=>{const response=await fetch(base+path,{method,headers:{'x-before-gateway-key':gatewayKey,...(role?{Cookie:sessions[role]}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});return{status:response.status,data:await response.json(),headers:response.headers};};
 for(const role of ['moderator','researcher']){const login=await call('/api/session',{method:'POST',body:{role}});sessions[role]=login.headers.get('set-cookie').split(';')[0];}
 const draft=moderationTemplate('harm');const original=await call('/api/public/sites/demo-forum/config');assert.equal(original.data.arms[0].intervention.blocks,undefined);
 assert.equal((await call('/api/moderator/sites/demo-forum/draft',{method:'PUT',body:draft,role:'moderator'})).status,200);
 assert.equal((await call('/api/public/sites/demo-forum/config')).data.arms[0].intervention.blocks,undefined);
 const published=await call('/api/moderator/sites/demo-forum/publish',{method:'POST',body:{},role:'moderator'});assert.equal(published.status,200);const fixed=structuredClone(published.data.publications.at(-1).intervention);
 const delivered=(await call('/api/public/sites/demo-forum/config')).data.arms[0].intervention;assert.deepEqual(delivered.blocks,draft.blocks);assert.equal(delivered.appearance,'facts');
 draft.blocks.education[0].en='A new draft only';assert.equal((await call('/api/moderator/sites/demo-forum/draft',{method:'PUT',body:draft,role:'moderator'})).status,200);assert.deepEqual((await call('/api/public/sites/demo-forum/config')).data.arms[0].intervention.blocks,fixed.blocks);
 const study=newStudy('A block-based comparison');study.arms[0].intervention=moderationTemplate('guided');study.arms[1].intervention=moderationTemplate('quick-help');const created=await call('/api/researcher/studies',{method:'POST',body:study,role:'researcher'});assert.equal(created.status,201);
 const research=await call(`/api/researcher/studies/${created.data.id}/publish`,{method:'POST',body:{},role:'researcher'});assert.equal(research.status,200);const snapshot=structuredClone(research.data.publications[0].arms[0].intervention.blocks);
 study.arms[0].intervention.blocks.reflection[0].nl='Alleen een later concept';assert.equal((await call(`/api/researcher/studies/${created.data.id}`,{method:'PUT',body:study,role:'researcher'})).status,200);const stored=await call(`/api/researcher/studies/${created.data.id}`,{role:'researcher'});assert.deepEqual(stored.data.publications[0].arms[0].intervention.blocks,snapshot);
 const invalid=withBlock();invalid.blocks.education[0].src='https://untrusted.example';assert.equal((await call('/api/moderator/sites/demo-forum/draft',{method:'PUT',body:invalid,role:'moderator'})).status,400);
});
