import './renderer.css';
import { DEFAULT_INTERVENTION, ORDERS, escapeHtml as esc, preferredLanguage } from '../core/model.js';
import { icon, mark, landscape } from './icons.js';
import { infoButton, openInfoDialog } from './disclosure.js';
import { WORDMARK } from './brand.js';
import { ENFORCEMENT_NOTICE } from '../content/legal-notices.js';
import { MESSAGE_APPEARANCES } from '../core/message-blocks.js';
import { renderMessageBlocks } from './message-blocks-view.js';

const WORDS = {
  en: {
    stages: { reflection: 'Reflect', education: 'Understand', support: 'Find support' },
    eyebrow: 'ONE MOMENT AT A TIME', help: 'Find support', leave: 'Leave this page', next: 'Find support', previous: 'Back',
    country: 'Information for', nl: 'Netherlands', unknown: 'Other / unknown', countryHint: 'Country is a suggestion. Choose the country relevant to you.',
    legal: 'Legal information', legalSource: 'Read the official source', noLegal: 'No reviewed local legal information is available for this country.',
    service: 'Visit service', phone: 'Telephone', serviceNote: 'Check the service for languages, availability, and confidentiality.',
    privacy: 'Your original submission is not sent to these services. Their own privacy policies apply when you visit.',
    noServices: 'Support information is available in the help directory.', directory: 'Open help directory',
    play: 'Play scenes', pause: 'Pause scenes', replay: 'Replay', timeline: 'Scene playback position', static: 'Static reading view', animated: 'Scene playback available',
    preview: 'Preview', status: 'Support is available when you are ready.', caption: 'There is space for a different next step.', info: 'About this page', channels: {phone:'Phone',chat:'Chat','self-help':'Self-guided support',web:'Online',email:'Email'}, languages: {nl:'Dutch',en:'English'}, phoneHelp:'Explore phone and chat support', selfHelp:'Open self-guided support', onlineHelp:'Explore support options',
  },
  nl: {
    stages: { reflection: 'Stilstaan', education: 'Begrijpen', support: 'Hulp vinden' },
    eyebrow: 'EEN MOMENT TEGELIJK', help: 'Hulp vinden', leave: 'Verlaat deze pagina', next: 'Hulp vinden', previous: 'Terug',
    country: 'Informatie voor', nl: 'Nederland', unknown: 'Ander / onbekend', countryHint: 'Het land is een suggestie. Kies het land dat voor jou relevant is.',
    legal: 'Juridische informatie', legalSource: 'Lees de officiële bron', noLegal: 'Voor dit land is geen gecontroleerde lokale juridische informatie beschikbaar.',
    service: 'Bezoek de dienst', phone: 'Telefoon', serviceNote: 'Bekijk bij de dienst welke talen, openingstijden en vertrouwelijkheid gelden.',
    privacy: 'Je oorspronkelijke invoer wordt niet naar deze diensten gestuurd. Bij een bezoek gelden hun eigen privacyvoorwaarden.',
    noServices: 'Informatie over ondersteuning staat in de hulpgids.', directory: 'Open de hulpgids',
    play: 'Speel scènes af', pause: 'Pauzeer scènes', replay: 'Opnieuw', timeline: 'Positie in de scèneweergave', static: 'Statische leesweergave', animated: 'Scèneweergave beschikbaar',
    preview: 'Voorbeeld', status: 'Er is ondersteuning wanneer je eraan toe bent.', caption: 'Er is ruimte voor een andere volgende stap.', info: 'Over deze pagina', channels: {phone:'Telefoon',chat:'Chat','self-help':'Zelfhulp',web:'Online',email:'E-mail'}, languages: {nl:'Nederlands',en:'Engels'}, phoneHelp:'Bekijk telefonische hulp en chat', selfHelp:'Open de zelfhulp', onlineHelp:'Bekijk de hulpopties',
  },
};

function validOrder(order) {
  return ORDERS.some(candidate => JSON.stringify(candidate) === JSON.stringify(order)) ? [...order] : [...ORDERS[0]];
}

function safeURL(value) {
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : null; } catch { return null; }
}

/** The one renderer used by authored previews and delivered intervention snapshots. */
export function renderJourney(container, intervention = DEFAULT_INTERVENTION, options = {}) {
  const snapshot = structuredClone(intervention);
  const plain = snapshot.layout === 'plain';
  const meaning = snapshot.layout === 'meaning';
  const appearance=MESSAGE_APPEARANCES.includes(snapshot.appearance)?snapshot.appearance:'default';
  const guided=appearance==='guided';
  const order = plain ? ['education','support'] : validOrder(snapshot.order);
  let language = preferredLanguage([options.language || 'en']);
  let country = options.country || 'UNKNOWN';
  let services = options.services || [];
  let legalPack = options.legalPack || null;
  let stageIndex = plain ? 0 : Math.max(0, Math.min(order.length - 1, options.initialStage || 0));
  const reduced = options.reducedMotion ?? globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  let reading = reduced || snapshot.layout !== 'scene' || snapshot.motion?.enabled !== true;
  const hold = Math.max(2, Math.min(10, snapshot.motion?.holdSeconds || 5));
  const duration = Math.min(30, hold * order.length);
  let position = stageIndex * hold;
  let playing = false;
  let frame = 0;
  let lastTick = null;
  let disposed = false;
  let contentObserver = null;
  let supportObserver = null;
  const preview = options.preview === true;
  const selectableBlocks=preview&&(options.selectableBlocks===true||typeof options.onSelectBlock==='function');
  const blocks=stage=>renderMessageBlocks(snapshot,stage,language,{editable:selectableBlocks});
  function previewContext(){if(!preview)return;services=(options.services||[]).filter(service=>!service.country||service.country===country);legalPack=options.legalPack?.country===country?options.legalPack:null;}
  previewContext();
  const previewServices = [{ id: 'preview-help', name: language === 'nl' ? 'Een passende hulpdienst' : 'An appropriate support service', url: null }];
  container.classList.add('before-renderer');
  container.classList.toggle('before-plain-preview',plain&&preview);

  function stop() { playing = false; lastTick = null; cancelAnimationFrame(frame); refreshPlayback(); }

  function supportCards(l) {
    const visibleServices = services.length ? services : preview ? previewServices : [];
    if (!visibleServices.length) return `<p class="before-service-empty">${l.noServices}</p><a class="before-button" href="/help?lang=${language}" data-directory>${l.directory} ${icon('arrow', 16)}</a>`;
    return visibleServices.map(service => {
      const url = safeURL(service.url);
      const channels=(service.channels||[]).filter(channel=>channel!=='web'||!(service.channels||[]).includes('self-help')).map(channel=>l.channels[channel]||channel).join(' · ');
      const languages=(service.languages||[]).map(value=>l.languages[value]||value.toUpperCase()).join(' / ');
      const action=service.channels?.includes('phone')?l.phoneHelp:service.channels?.includes('self-help')?l.selfHelp:l.onlineHelp;
      const label = `<span class="before-service-icon">${icon(service.channels?.includes('phone') ? 'message' : 'book', 22)}</span><span><strong>${esc(service.name)}</strong><span class="before-service-note">${esc([channels,languages].filter(Boolean).join(' · '))}</span>${service.phone ? `<span class="before-service-phone">${l.phone}: ${esc(service.phone)}</span>` : ''}<span class="before-service-action">${esc(action)} ${icon('external', 14)}</span></span>${icon('arrow', 18)}`;
      return preview || !url ? `<div class="before-service-card" aria-label="${esc(service.name)} — ${l.preview}">${label}</div>` : `<a class="before-service-card" href="${esc(url)}" target="_blank" rel="noopener noreferrer" data-help="${esc(service.id || '')}">${label}</a>`;
    }).join('');
  }

  function legalBlock(l) {
    if (!snapshot.legal) return '';
    const summary = legalPack?.legal?.[`summary_${language}`] || legalPack?.legal?.summary_en;
    const source = safeURL(legalPack?.legal?.source_url);
    if (!summary || legalPack.country !== country) return `<p class="before-country-note">${l.noLegal}</p>`;
    const notice = plain && country === 'NL' && legalPack.country === 'NL' && ENFORCEMENT_NOTICE.country === 'NL' ? `<section class="before-enforcement-note" data-enforcement-notice><h3>${language==='nl'?'Anonimiteit en opsporing':'Anonymity and investigations'}</h3><p>${esc(ENFORCEMENT_NOTICE[language] || ENFORCEMENT_NOTICE.en)}</p><a href="${esc(safeURL(ENFORCEMENT_NOTICE.sourceUrl))}" target="_blank" rel="noopener noreferrer">${language==='nl'?'Lees de politiebron':'Read the police source'} ${icon('external',13)}</a></section>` : '';
    return `<aside class="before-legal">${plain?'':icon('book', 22)}<div><h2>${l.legal} · ${country === 'NL' ? l.nl : esc(country)}</h2><p>${esc(summary)}</p>${source ? `<a href="${esc(source)}" target="_blank" rel="noopener noreferrer">${l.legalSource} ${icon('external', 13)}</a>` : ''}${notice}</div></aside>`;
  }

  function meaningMotif() {
    const labels=language==='nl'?['Jouw tijd.','Jouw keuzes.','Jouw leven.']:['Your time.','Your choices.','Your life.'];
    return `<aside class="before-meaning-motif" aria-hidden="true"><span>${language==='nl'?'EEN VRAAG OVER JE LEVEN':'A QUESTION ABOUT YOUR LIFE'}</span><div>${labels.map((label,i)=>`<span class="before-value-${i}">${label}</span>`).join('')}</div><small>01 — ${language==='nl'?'EEN ANDERE RICHTING':'A DIFFERENT DIRECTION'}</small></aside>`;
  }

  function guidedMotif() {
    const words=language==='nl'?['Even stilstaan','Een andere keuze','Hulp verkennen']:['Pause here','A different choice','Explore support'];
    return `<aside class="before-guided-motif" aria-hidden="true"><span>${language==='nl'?'EEN KLEINE VERANDERING':'ONE SMALL CHANGE'}</span><strong>01</strong><ol>${words.map((word,i)=>`<li><span>0${i+1}</span>${word}</li>`).join('')}</ol></aside>`;
  }

  function plainDocument(l,copy,titleTag,stageTag) {
    return `<${stageTag} class="before-plain-document" data-before-stage="education" data-edit-focus="${options.initialStage===1?'support':'education'}" tabindex="-1"><section class="before-plain-education" data-before-education-content><${titleTag} data-before-headline tabindex="-1">${esc(copy.educationTitle)}</${titleTag}><p class="before-body">${esc(copy.educationBody)}</p>${blocks('education')}${legalBlock(l)}<span class="before-content-end" data-before-content-end="education" aria-hidden="true"></span></section><section class="before-plain-support" data-before-support><h2 data-before-support-start tabindex="-1">${esc(copy.helpTitle)}</h2><p class="before-body">${esc(copy.helpBody)}</p>${blocks('support')}<div class="before-services">${supportCards(l)}</div></section></${stageTag}>`;
  }

  function draw() {
    if (disposed) return;
    contentObserver?.disconnect();
    contentObserver = null;
    supportObserver?.disconnect();supportObserver=null;
    const l = WORDS[language];
    const copy = snapshot[language] || snapshot.en || DEFAULT_INTERVENTION[language];
    const stage = order[stageIndex];
    const scene = !reading;
    const stageTag = preview ? 'section' : 'main';
    const titleTag = preview ? 'h2' : 'h1';
    container.dataset.layout = plain ? 'plain' : meaning ? 'meaning' : scene ? 'scene' : 'reading';
    container.dataset.appearance=appearance;
    container.dataset.beforeExperience = plain ? 'plain' : meaning ? 'meaning' : 'calm';
    container.dataset.transition = reduced ? 'none' : snapshot.motion?.transition || 'none';
    container.lang = language;
    const countries = [...new Set(['NL', ...(country !== 'UNKNOWN' && country !== 'OTHER' ? [country] : []), 'UNKNOWN'])];
    container.innerHTML = `<div class="before-journey ${preview ? 'before-preview' : ''}">
      <header class="before-header"><span class="before-brand">${mark}<span>${WORDMARK}</span></span><div class="before-header-actions">${plain?`<button class="before-text-button" data-support>${l.help}</button>`:''}${preview ? `<span class="before-preview-label">${l.preview}</span>` : `<div class="before-language" aria-label="Language"><button data-language="en" aria-pressed="${language === 'en'}">EN</button><button data-language="nl" aria-pressed="${language === 'nl'}">NL</button></div><button class="before-text-button before-exit" data-exit>${l.leave} ${icon('close', 16)}</button>`}${infoButton('journey',l.info)}</div></header>
      ${plain?'':`<nav class="before-progress" aria-label="${language === 'nl' ? 'Stappen' : 'Journey steps'}">${order.map((key, i) => `<button data-stage="${i}" ${i === stageIndex ? 'aria-current="step"' : ''}><span>${i < stageIndex ? icon('check', 12) : `0${i + 1}`}</span><span>${l.stages[key]}</span></button>`).join('')}</nav>`}
      ${plain?plainDocument(l,copy,titleTag,stageTag):`<${stageTag} class="before-stage before-stage-${stage}" tabindex="-1" data-before-stage="${stage}">
        ${stage === 'reflection' ? `${meaning?meaningMotif():guided?guidedMotif():`<div class="before-art" aria-hidden="true">${landscape}</div>`}<section class="before-stage-copy"><p class="before-eyebrow">${meaning?(language==='nl'?'JOUW TIJD VORMT JE LEVEN':'YOUR TIME ADDS UP TO YOUR LIFE'):guided?(language==='nl'?'KIES JE VOLGENDE ACTIE':'CHOOSE YOUR NEXT ACTION'):l.eyebrow}</p><${titleTag} data-before-headline tabindex="-1">${esc(copy.title)}</${titleTag}><p class="before-body">${esc(copy.body)}</p>${blocks('reflection')}<div class="before-cta"><button class="before-button" data-next>${esc(copy.button)} ${icon('arrow', 17)}</button><button class="before-text-button" data-support>${l.help} ${icon('arrow', 15)}</button></div></section>` : ''}
        ${stage === 'education' ? `<section class="before-stage-copy"><p class="before-eyebrow">${appearance==='facts'?(language==='nl'?'DE FEITEN':'THE FACTS'):l.stages.education}</p><${titleTag} data-before-headline tabindex="-1">${esc(copy.educationTitle)}</${titleTag}><p class="before-body">${esc(copy.educationBody)}</p>${blocks('education')}${legalBlock(l)}<span class="before-content-end" data-before-content-end="education" aria-hidden="true"></span><div class="before-cta"><button class="before-button" data-support>${l.next} ${icon('arrow', 17)}</button>${stageIndex > 0 ? `<button class="before-text-button" data-stage="${stageIndex - 1}">${l.previous}</button>` : ''}</div></section>` : ''}
        ${stage === 'support' ? `<section class="before-support-content"><p class="before-eyebrow">${l.stages.support}</p><${titleTag} data-before-headline tabindex="-1">${esc(copy.helpTitle)}</${titleTag}><p class="before-body">${esc(copy.helpBody)}</p>${blocks('support')}<div class="before-services">${supportCards(l)}</div>${stageIndex > 0 ? `<button class="before-text-button before-support-back" data-stage="${stageIndex - 1}">${l.previous}</button>` : ''}</section>` : ''}
      </${stageTag}>`}
      ${snapshot.motion?.enabled && snapshot.layout === 'scene' ? `<section class="before-playback" aria-label="${l.timeline}"><button class="before-text-button" data-play>${icon(playing ? 'pause' : 'play', 15)}<span>${playing ? l.pause : l.play}</span></button><button class="before-text-button" data-replay>${l.replay}</button><label class="before-timeline-label"><span class="before-sr-only">${l.timeline}</span><input class="before-timeline" type="range" min="0" max="${duration}" step="0.1" value="${position}" aria-label="${l.timeline}" ${reading ? 'disabled' : ''}></label><span class="before-time" aria-live="off">${Math.floor(position)} / ${duration}s</span><label class="before-static"><input type="checkbox" data-reading ${reading ? 'checked' : ''}>${l.static}</label></section>` : ''}
      <footer class="before-footer"><label>${l.country}<select data-country aria-label="${l.country}">${countries.map(code => `<option value="${code}" ${code === country || code === 'UNKNOWN' && country === 'OTHER' ? 'selected' : ''}>${code === 'NL' ? l.nl : code === 'UNKNOWN' ? l.unknown : esc(code)}</option>`).join('')}</select></label>${preview ? '' : `<a class="before-help-fallback" href="/help?lang=${language}&country=${country==='NL'?'NL':'UNKNOWN'}">${l.directory}</a>`}</footer>
    </div>`;
    container.querySelectorAll('[data-stage]').forEach(button => button.onclick = () => goTo(Number(button.dataset.stage), true));
    container.querySelectorAll('[data-support]').forEach(button => button.onclick = () => goTo(order.indexOf('support'), true));
    container.querySelectorAll('[data-next]').forEach(button => button.onclick = () => goTo(Math.min(stageIndex + 1, order.length - 1), true));
    if(selectableBlocks&&options.onSelectBlock)container.querySelectorAll('[data-message-block]').forEach(block=>{
      const select=()=>options.onSelectBlock(block.dataset.messageBlock,block.dataset.messageStage);
      block.addEventListener('click',select);
      block.addEventListener('keydown',event=>{if(['Enter',' '].includes(event.key)){event.preventDefault();select();}});
    });
    container.querySelectorAll('[data-language]').forEach(button => button.onclick = () => { language = button.dataset.language; draw(); options.onLanguage?.(language); });
    container.querySelector('[data-country]').onchange = e => { country = e.target.value; previewContext(); draw(); options.onCountry?.(country); };
    container.querySelector('[data-info="journey"]').onclick=()=>openInfoDialog({title:l.info,body:`<p>${esc(l.privacy)}</p><p>${esc(l.serviceNote)}</p><p>${esc(l.countryHint)}</p>${preview||options.unmeasured?`<p>${language==='nl'?'Dit is een voorbeeld. Acties worden niet gemeten.':'This is an unmeasured preview. Its actions do not contribute to reports.'}</p>`:`<p>${language==='nl'?'Deze lokale demonstratie gebruikt synthetische invoer en geaggregeerde tellingen. Er worden geen individuele bezoekersprofielen opgeslagen.':'This local demonstration uses synthetic input and aggregate counters. No individual visitor profiles are stored.'}</p>`}<p><a href="https://db-ip.com" target="_blank" rel="noopener noreferrer">${language==='nl'?'Landinschatting: DB-IP Lite':'Country estimate: DB-IP Lite'}</a></p>`});
    container.querySelectorAll('[data-help]').forEach(link => link.onclick = () => options.onHelp?.(link.dataset.help));
    container.querySelector('[data-exit]')?.addEventListener('click', () => { stop(); options.onExit?.(); });
    container.querySelector('[data-play]')?.addEventListener('click', () => playing ? stop() : play());
    container.querySelector('[data-replay]')?.addEventListener('click', () => { stop(); position = 0; stageIndex = 0; draw(); });
    container.querySelector('[data-reading]')?.addEventListener('change', e => { stop(); reading = e.target.checked; draw(); });
    container.querySelector('.before-timeline')?.addEventListener('input', e => { stop(); seek(Number(e.target.value)); });
    options.onStage?.(plain?'education':stage);
    observeContentEnd(plain?'education':stage);
    observeSupportVisibility();
    if(plain&&preview)queueMicrotask(()=>{
      if(disposed)return;
      const target=container.querySelector(options.initialStage===1?'[data-before-support]':'[data-before-education-content]');
      if(target)container.scrollTop=options.initialStage===1?target.getBoundingClientRect().top-container.getBoundingClientRect().top+container.scrollTop-20:0;
    });
  }

  function observeContentEnd(stage = order[stageIndex]) {
    contentObserver?.disconnect();
    contentObserver = null;
    const marker = container.querySelector('[data-before-content-end]');
    if (preview || stage !== 'education' || !marker || !options.onContentEnd || !globalThis.IntersectionObserver) return;
    contentObserver = new IntersectionObserver(entries => {
      if (disposed || order[stageIndex] !== stage || document.visibilityState !== 'visible' || document.querySelector('dialog[open]')) return;
      if (entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= 1)) {
        contentObserver?.disconnect();
        contentObserver = null;
        options.onContentEnd(stage);
      }
    }, { threshold: 1 });
    contentObserver.observe(marker);
  }

  function observeSupportVisibility() {
    supportObserver?.disconnect();supportObserver=null;
    const heading=container.querySelector('[data-before-support-start]');
    if(!plain || preview || !heading || !options.onSupportVisible || !globalThis.IntersectionObserver)return;
    supportObserver=new IntersectionObserver(entries=>{
      if(disposed || document.visibilityState!=='visible' || document.querySelector('dialog[open]'))return;
      if(entries.some(entry=>entry.isIntersecting && entry.intersectionRatio>=.5)){
        supportObserver?.disconnect();supportObserver=null;options.onSupportVisible();
      }
    },{threshold:.5});supportObserver.observe(heading);
  }

  function resumeContentObservation() {
    if (document.visibilityState === 'visible') {observeContentEnd();observeSupportVisibility();}
  }
  document.addEventListener('visibilitychange', resumeContentObservation);
  document.addEventListener('close', resumeContentObservation, true);

  function refreshPlayback() {
    const l = WORDS[language];
    const button = container.querySelector('[data-play]');
    if (button) { button.innerHTML = `${icon(playing ? 'pause' : 'play', 15)}<span>${playing ? l.pause : l.play}</span>`; button.disabled = reading; }
    const slider = container.querySelector('.before-timeline');
    if (slider && document.activeElement !== slider) slider.value = position;
    const clock = container.querySelector('.before-time');
    if (clock) clock.textContent = `${Math.floor(position)} / ${duration}s`;
  }

  function seek(seconds) {
    position = Math.max(0, Math.min(duration, seconds));
    const next = Math.min(order.length - 1, Math.floor(position / hold));
    if (next !== stageIndex) { stageIndex = next; draw(); }
    refreshPlayback();
  }

  function goTo(index, focus = false) {
    if(plain){
      options.onInlineNavigation?.();
      const target=container.querySelector(index>=1?'[data-before-support]':'[data-before-education-content]');
      if(preview&&target)container.scrollTo({top:target.getBoundingClientRect().top-container.getBoundingClientRect().top+container.scrollTop-20,behavior:reduced?'auto':'smooth'});
      else target?.scrollIntoView({behavior:reduced?'auto':'smooth',block:'start'});
      if(focus)target?.querySelector(index>=1?'[data-before-support-start]':'[data-before-headline]')?.focus({preventScroll:true});
      return;
    }
    stop(); stageIndex = Math.max(0, Math.min(order.length - 1, index)); position = stageIndex * hold; draw();
    if (focus) container.querySelector('[data-before-headline]')?.focus({ preventScroll: true });
  }

  function tick(time) {
    if (!playing || disposed) return;
    if (document.visibilityState !== 'visible') { lastTick = null; frame = requestAnimationFrame(tick); return; }
    const delta = lastTick === null ? 0 : (time - lastTick) / 1000;
    lastTick = time;
    seek(position + delta);
    if (position >= duration) { stop(); return; }
    frame = requestAnimationFrame(tick);
  }

  function play() { if (reading || disposed) return; if (position >= duration) seek(0); playing = true; lastTick = null; refreshPlayback(); frame = requestAnimationFrame(tick); }
  function destroy() { stop(); disposed = true; contentObserver?.disconnect(); supportObserver?.disconnect(); document.removeEventListener('visibilitychange', resumeContentObservation); document.removeEventListener('close', resumeContentObservation, true); container.replaceChildren(); container.classList.remove('before-renderer','before-plain-preview'); }
  draw();
  return { destroy, goTo, get stage() { return plain?'education':order[stageIndex]; }, get educationVisible() { if(!plain)return order[stageIndex]==='education';const section=container.querySelector('[data-before-education-content]');if(!section)return false;const rect=section.getBoundingClientRect();return rect.bottom>0&&rect.top<(globalThis.innerHeight||document.documentElement.clientHeight); }, get language() { return language; }, get country() { return country; }, updateContext(context = {}) { language = preferredLanguage([context.language || language]); country = context.country || country; services = context.services || services; legalPack = Object.hasOwn(context, 'legalPack') ? context.legalPack : legalPack; draw(); } };
}

export function renderPreview(container, intervention, options = {}) {
  const controller = renderJourney(container, intervention, { ...options, preview: true, onStage: options.onPreviewStage, onHelp: undefined, onExit: undefined });
  return () => controller.destroy();
}
