import '@fontsource-variable/dm-sans';
import '@fontsource-variable/newsreader';
import './styles.css';
import './journey.css';
import './renderer.css';
import './community.css';
import { icon } from './icons.js';
import { escapeHtml as esc } from '../core/model.js';
import { mountDiscordDemo } from './discord-demo.js';
import { infoButton, openInfoDialog } from './disclosure.js';
import { PRODUCT_NAME } from './brand.js';

const root = document.querySelector('#demo');
const endpoint = location.port === '3004' ? `${location.protocol}//${location.hostname}:3000` : location.origin;
const path = location.pathname;
const fieldnotes = path.includes('fieldnotes') || new URLSearchParams(location.search).get('platform') === 'fieldnotes';
const control = path.includes('/control');
const siteId = fieldnotes ? 'demo-fieldnotes' : 'demo-forum';
const panel = `<nav class="demo-nav" aria-label="Demo navigation"><span class="demo-site-brand">${icon(fieldnotes ? 'book' : 'leaf', 28)}${control ? `${PRODUCT_NAME} · Presenter controls` : fieldnotes ? 'Fieldnotes' : 'MySmall20kUserForum'}</span><div class="demo-nav-actions"><a class="text-link" href="${endpoint}/moderator/integrations">Moderator dashboard ${icon('arrow', 15)}</a>${infoButton('website','About this page')}</div></nav>`;

if (fieldnotes) document.body.classList.add('fieldnotes');

function bindInfo() {
  root.querySelector('[data-info="website"]')?.addEventListener('click', () => openInfoDialog({title: control ? 'Presenter controls' : 'About this website', body: `<p>This is a fictional website for testing the real ${esc(PRODUCT_NAME)} browser package. Only test-trigger-* examples activate its demonstration matcher. Production detection is supplied separately.</p><p>All generated scenarios and interactions use synthetic data. Simulation assumptions do not establish which intervention works.</p><p>Original search text is never sent to ${esc(PRODUCT_NAME)}. Reports store aggregate counters without visitor identities.</p>`}));
}

async function api(url, body) {
  const response = await fetch(`${endpoint}${url}`, {
    method: body === undefined ? 'GET' : 'POST', credentials: 'include', referrerPolicy: 'no-referrer',
    headers: { 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const value = await response.json();
  if (!response.ok) throw new Error(value.error || 'The local demo service could not complete the request.');
  return value;
}

async function renderControl() {
  document.title = `Demo control — ${PRODUCT_NAME}`;
  root.innerHTML = `<main class="demo-shell">${panel}<header class="demo-header"><div><p class="eyebrow">PRESENTER CONTROLS</p><h1>Prepare your walkthrough.</h1><p>Open a platform, generate example results, or restore the starting setup.</p></div><div class="demo-control-links"><a class="button" href="${endpoint}/moderator/overview">Moderator workspace ${icon('arrow', 15)}</a><a class="button" href="${endpoint}/researcher/studies">Researcher workspace ${icon('arrow', 15)}</a><a class="button" href="${endpoint}/demo/forum">MySmall20kUserForum</a><a class="button" href="http://localhost:3004/demo/fieldnotes">Second-origin website</a><a class="button" href="http://localhost:9400/">WordPress demo</a></div></header><section class="panel demo-control-panel"><div class="panel-heading"><div><h2>Generate example traffic</h2></div></div><form id="scenario-form"><div class="demo-control-grid"><label>Installation<select name="siteId"><option value="demo-forum">MySmall20kUserForum</option><option value="demo-fieldnotes">Fieldnotes</option><option value="wordpress">WordPress</option></select></label><label>Intervention views<input name="volume" type="number" min="20" max="10000" step="10" value="500" required></label><label>Repeatable scenario key<input name="seed" maxlength="80" value="pitch-rehearsal-1" required></label><label>Help-link click rate · A (%)<input name="helpA" type="number" min="0" max="100" step="1" value="10" required></label><label>Help-link click rate · B (%)<input name="helpB" type="number" min="0" max="100" step="1" value="10" required></label></div><div class="inline-actions"><button class="button primary" type="submit">Generate traffic ${icon('play', 16)}</button><a class="text-link" href="${endpoint}/researcher/studies">Research results ${icon('arrow', 15)}</a></div><p class="field-hint">Uses the study enabled on this installation, or its published default message.</p></form></section><div id="control-status" class="demo-status" role="status">Connecting to the local presenter service…</div><section class="panel demo-control-panel"><div class="panel-heading"><div><h2>Start a clean rehearsal</h2><p>Reset removes locally authored drafts, publications, study participation, and demo counters, then restores the seeded scenario.</p></div></div><div class="demo-reset-actions"><button class="button" id="reset-demo">Prepare a reset</button><button class="button primary" id="confirm-reset" hidden>Confirm reset of local demo data</button></div></section><footer class="demo-footer"><a class="text-link" href="${endpoint}/">Back to launchpad ${icon('arrow', 15)}</a></footer></main>`;
  bindInfo();
  const status = root.querySelector('#control-status');
  let ready = false;
  try { await api('/api/session', { role: 'presenter' }); ready = true; status.textContent = 'Presenter controls connected.'; }
  catch (error) { status.textContent = error.message; }
  root.querySelector('#scenario-form').onsubmit = async event => {
    event.preventDefault();
    if (!ready) { status.textContent = 'Start the local backend before generating a scenario.'; return; }
    const form = new FormData(event.target);
    const button = event.target.querySelector('button[type="submit"]'); button.disabled = true;
    try {
      const generated = await api(`/api/presenter/sites/${form.get('siteId')}/simulate`, { volume: Number(form.get('volume')), seed: form.get('seed'), helpRates: { A: Number(form.get('helpA')) / 100, B: Number(form.get('helpB')) / 100 } });
      status.textContent = `Generated ${generated.generated ?? form.get('volume')} example views. Open results and select the example dataset to inspect them.`;
    } catch (error) { status.textContent = error.message; }
    finally { button.disabled = false; }
  };
  root.querySelector('#reset-demo').onclick = () => { root.querySelector('#confirm-reset').hidden = false; };
  root.querySelector('#confirm-reset').onclick = async event => {
    event.currentTarget.disabled = true;
    try { await api('/api/presenter/reset', {}); status.textContent = 'The local demo has been reset. Reload an open workspace to see its seeded state.'; root.querySelector('#confirm-reset').hidden = true; }
    catch (error) { status.textContent = error.message; }
    finally { root.querySelector('#confirm-reset').disabled = false; }
  };
}

const forumThreads = [
  { category:'Outdoors', title:'The long way home', author:'Nora', initials:'NK', color:'blue', time:'18 min ago', replies:12, views:'284', body:'What is your favourite route when you have a little extra time? Share the parks, quiet streets and unexpected corners you keep coming back to.' },
  { category:'Everyday life', title:'Something good this week', author:'Sam', initials:'SL', color:'amber', time:'42 min ago', replies:28, views:'613', body:'A good conversation, a finished project, or something that made you smile. This is our weekly space for the small things.' },
  { category:'Making things', title:'What are you making?', author:'Maya', initials:'MR', color:'violet', time:'1 hour ago', replies:19, views:'407', body:'From weekend recipes to works in progress: show us what is on your table. Unfinished projects are welcome here.' },
  { category:'Local discoveries', title:'A useful little place you found', author:'Elliot', initials:'EC', color:'teal', time:'2 hours ago', replies:8, views:'195', body:'An independent bookshop, a repair café or a spot for a quiet lunch. Tell the community about a place worth knowing.' },
  { category:'Outdoors', title:'Weekend walking group', author:'Robin', initials:'RT', color:'rose', time:'3 hours ago', replies:16, views:'352', body:'An easy walk, good company and no particular hurry. This thread is for ideas about a relaxed weekend outside.' },
  { category:'Making things', title:'The project that taught you something', author:'Alex', initials:'AH', color:'blue', time:'Yesterday', replies:24, views:'529', body:'Sometimes the useful part is what you learn along the way. Which project changed how you approach making things?' },
];
const readingThreads = [
  { category:'Books', title:'Books to slow down with', author:'June', initials:'JM', color:'amber', time:'This morning', replies:14, views:'328', body:'A reading list for a quiet weekend: patient stories, short essays and books that make room for a second thought.' },
  { category:'Writing', title:'The first sentence', author:'Theo', initials:'TW', color:'blue', time:'Yesterday', replies:22, views:'492', body:'Share the opening line of a story you would like to write. A small beginning can be enough for today.' },
  { category:'Walking', title:'Notes from a morning walk', author:'Mina', initials:'MP', color:'rose', time:'Yesterday', replies:9, views:'216', body:'Small observations from the world outside. A notebook, a familiar path, and the things you notice when you slow down.' },
  { category:'Books', title:'What is in the margin?', author:'Rae', initials:'RL', color:'teal', time:'Monday', replies:11, views:'265', body:'Underlines, questions and little arguments with the page. A conversation about the notes we leave for ourselves.' },
];

async function renderCommunity() {
  document.title = fieldnotes ? 'Fieldnotes — Reading room' : 'MySmall20kUserForum — Community forum';
  document.body.classList.add('community-site',fieldnotes?'community-reading':'community-forum');
  const favicon=document.querySelector('link[rel="icon"]')||Object.assign(document.createElement('link'),{rel:'icon'});
  favicon.href='data:image/svg+xml,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" rx="${fieldnotes?0:8}" fill="${fieldnotes?'#f6f3ed':'#1e304b'}"/><text x="20" y="${fieldnotes?29:27}" fill="${fieldnotes?'#9d493d':'#fff'}" font-family="${fieldnotes?'Georgia':'Arial'}" font-size="${fieldnotes?32:19}" text-anchor="middle" font-weight="${fieldnotes?'normal':'bold'}">${fieldnotes?'f.':'cg'}</text></svg>`);
  if(!favicon.parentNode)document.head.append(favicon);
  const threads=fieldnotes?readingThreads:forumThreads;
  const categories=[...new Set(threads.map(thread=>thread.category))];
  const title=fieldnotes?'Fieldnotes':'MySmall20kUserForum';
  root.innerHTML=`<div class="cg-site"><header class="cg-header"><div class="cg-header-inner"><a class="cg-brand" href="${fieldnotes?'/demo/fieldnotes':'/demo/forum'}">${fieldnotes?'<span class="cg-reading-mark">f.</span>':'<span class="cg-logo">m</span>'}<span>${title}<small>${fieldnotes?'A reading & writing community':'The community forum'}</small></span></a><div class="cg-header-actions"><button type="button" class="cg-test-button" id="fill-example">Try test search</button>${infoButton('website','About this website')}</div></div></header><div class="cg-layout"><aside class="cg-sidebar"><p class="cg-nav-title">${fieldnotes?'THE READING ROOM':'YOUR COMMUNITY'}</p><button type="button" class="cg-nav-item selected" data-community-tab="latest">${icon(fieldnotes?'book':'message',18)}${fieldnotes?'All notes':'Latest discussions'}</button><button type="button" class="cg-nav-item" data-community-tab="top">${icon('heart',18)}${fieldnotes?'Most discussed':'Popular this week'}</button><div class="cg-category-nav"><p class="cg-nav-title">${fieldnotes?'SHELVES':'CATEGORIES'}</p><button type="button" class="cg-category selected" data-category="all"><span class="cg-category-dot all"></span>Everything <span>${threads.length}</span></button>${categories.map((category,i)=>`<button type="button" class="cg-category" data-category="${esc(category)}"><span class="cg-category-dot color-${i}"></span>${esc(category)}<span>${threads.filter(thread=>thread.category===category).length}</span></button>`).join('')}</div><div class="cg-sidebar-foot"><span class="cg-presence"></span>${fieldnotes?'Keep a place for a good conversation.':'A place for everyday conversations.'}</div></aside><main class="cg-main"><header class="cg-intro"><div>${fieldnotes?'<p class="cg-kicker">READ. NOTICE. SHARE.</p>':'<p class="cg-kicker">WELCOME TO MySmall20kUserForum</p>'}<h1>${fieldnotes?'A few good words.':'What’s happening?'}</h1><p>${fieldnotes?'Books on the table. Ideas in the margins. A room for thoughtful conversation.':'Find a conversation, share an interest, and discover something close to home.'}</p></div>${fieldnotes?'<span class="cg-issue">Reading room<br><strong>No. 08</strong></span>':''}</header><form id="demo-search" class="cg-search" action="${fieldnotes?'/demo/fieldnotes':'/demo/forum'}" method="get"><label for="demo-query">${fieldnotes?'Search the reading room':'Search the community'}<span class="cg-search-field">${icon('eye',19)}<input id="demo-query" name="q" type="search" autocomplete="off" placeholder="${fieldnotes?'Books, notes, conversations…':'Search discussions…'}" required></span></label><button type="submit" class="cg-search-button" disabled>Search</button></form><div id="demo-status" class="cg-status" role="status">Getting search ready…</div><section class="cg-discussions" aria-label="${fieldnotes?'Reading room conversations':'Community discussions'}"><div class="cg-list-header"><h2 id="community-list-title">${fieldnotes?'From the reading room':'Latest discussions'}</h2><span>${fieldnotes?'CONVERSATIONS':'REPLIES'}</span></div><div id="community-threads"></div></section><footer class="cg-footer"><span>${title} · ${fieldnotes?'Words worth making room for.':'Good conversations start here.'}</span><a href="${fieldnotes?'/demo/forum':'/demo/fieldnotes'}">${fieldnotes?'Visit MySmall20kUserForum':'Visit Fieldnotes'} ${icon('external',12)}</a></footer></main><aside class="cg-right-rail"><section class="cg-welcome"><span class="cg-rail-label">${fieldnotes?'ON THE NOTICEBOARD':'HELLO, NEIGHBOUR'}</span><h2>${fieldnotes?'Stay curious.':'You’re in good company.'}</h2><p>${fieldnotes?'Bring a book, a question, or an unfinished idea. There is always another way into a conversation.':'This is a space for shared interests and useful discoveries. Be curious. Be kind. Make room for someone new.'}</p></section><section class="cg-members"><h2>${fieldnotes?'Around the table':'Around the community'}</h2><div class="cg-member-faces">${(fieldnotes?readingThreads:forumThreads).slice(0,4).map(thread=>`<span class="cg-avatar ${thread.color}" title="${esc(thread.author)}">${thread.initials}</span>`).join('')}</div><p>${fieldnotes?'Readers, writers and the quietly curious.':'Walkers, makers and people with a good story.'}</p></section></aside></div></div>`;
  bindInfo();
  const form=root.querySelector('#demo-search');
  const status=root.querySelector('#demo-status');
  let category='all';let sort='latest';let search='';
  function renderThreads(){
    let visible=threads.filter(thread=>(category==='all'||thread.category===category)&&(!search||`${thread.title} ${thread.body} ${thread.category}`.toLowerCase().includes(search)));
    if(sort==='top')visible=[...visible].sort((a,b)=>b.replies-a.replies);
    root.querySelector('#community-threads').innerHTML=visible.length?visible.map(thread=>`<details class="cg-thread"><summary><span class="cg-avatar ${thread.color}">${thread.initials}</span><span class="cg-thread-copy"><strong>${esc(thread.title)}</strong><span><span class="cg-thread-category">${esc(thread.category)}</span><span>${esc(thread.author)} · ${esc(thread.time)}</span></span></span><span class="cg-thread-count"><strong>${thread.replies}</strong><small>${fieldnotes?'responses':'replies'}</small></span></summary><div class="cg-thread-body"><p>${esc(thread.body)}</p><span>${esc(thread.author)} · ${esc(thread.category)}</span></div></details>`).join(''):'<div class="cg-empty"><h3>No conversations found</h3><p>Try another search or choose a different category.</p></div>';
    root.querySelector('#community-list-title').textContent=category!=='all'?category:sort==='top'?(fieldnotes?'Most discussed':'Popular this week'):(fieldnotes?'From the reading room':'Latest discussions');
    root.querySelectorAll('[data-category]').forEach(button=>button.classList.toggle('selected',button.dataset.category===category));
    root.querySelectorAll('[data-community-tab]').forEach(button=>button.classList.toggle('selected',button.dataset.communityTab===sort));
    return visible.length;
  }
  renderThreads();
  root.querySelectorAll('[data-category]').forEach(button=>button.onclick=()=>{category=button.dataset.category;renderThreads();});
  root.querySelectorAll('[data-community-tab]').forEach(button=>button.onclick=()=>{sort=button.dataset.communityTab;renderThreads();});
  root.querySelector('#fill-example').onclick=()=>{const input=root.querySelector('#demo-query');input.value='test-trigger-red';input.focus();status.textContent='Test search is ready. Select Search to continue.';};
  form.addEventListener('submit',event=>{
    if(event.defaultPrevented){status.textContent='Opening the support page…';return;}
    event.preventDefault();search=String(new FormData(form).get('q')||'').trim().toLowerCase();const count=renderThreads();status.textContent=count?`${count} ${count===1?'conversation':'conversations'} found.`:'No matching conversations.';
  });
  document.addEventListener('before:error',event=>{status.textContent=event.detail?.message||'The support page could not load. Please try again.';});
  const script=document.createElement('script');script.src=`${endpoint}/embed/before.js`;script.async=true;
  script.onload=async()=>{try{await window.Before.init({endpoint,siteId,demo:true});window.Before.bind(form,{input:'#demo-query',demo:true});form.querySelector('button').disabled=false;status.textContent='Search is ready.';}catch{status.textContent='Search is temporarily unavailable. Please try again shortly.';}};
  script.onerror=()=>{status.textContent='Search is temporarily unavailable. Please try again shortly.';};document.head.appendChild(script);
}

if (control) renderControl();
else if (path.includes('/discord')) {
  mountDiscordDemo(root, { endpoint, siteId: 'demo-forum' });
} else renderCommunity();
