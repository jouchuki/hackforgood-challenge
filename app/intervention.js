import '@fontsource-variable/dm-sans';
import '@fontsource-variable/newsreader';
import './styles.css';
import './journey.css';
import { defaultConfig, preferredLanguage, escapeHtml as esc } from './shared.js';
import { icon, mark, landscape } from './icons.js';

const root = document.querySelector('#journey');
const params = new URLSearchParams(location.search);
let language = preferredLanguage([params.get('lang') || '', ...(navigator.languages || [])]);
let config = structuredClone(defaultConfig);
let country = 'NL';
let stage = 0;
let variant = 'B';
let visibleMs = 0;
let visibleStart = document.visibilityState === 'visible' ? performance.now() : null;
const returnPath = params.get('from') === 'forum' ? '/mock-platform/' : params.get('from') === 'fieldnotes' ? '/demo/?platform=fieldnotes' : '/demo/';
const legalSource = 'https://www.om.nl/onderwerpen/b/beleidsregels/aanwijzingen/jeugd---gezin---zeden/aanwijzing-kinderpornografie-2024a006';

const ui = {
  en: {
    demo: 'Design prototype · no visitor tracking', leave: 'Leave this page', support: 'Go straight to support',
    steps: ['A moment to reflect', 'Understand the impact', 'Find your next step'],
    eyebrow: 'YOUR NEXT STEP MATTERS', learnTitle: 'Your choices can protect children.',
    learnBody: 'Sexual abuse material involves harm to children. Choosing not to seek or share it is a step you can take now. Support is available if you are worried about your thoughts or behaviour.',
    legalTitle: 'Legal information for the Netherlands',
    legalBody: 'Dutch criminal law addresses child sexual abuse material under Article 252. The maximum prison sentence is six years, rising to nine for habitual or professional offending.',
    source: 'Read the official legal information', next: 'Explore support', back: 'Back',
    helpTitle: 'You do not have to figure this out alone.',
    helpBody: 'Choose a next step that feels possible. These independent services can explain their support, availability, and confidentiality.',
    service1: 'Talk to a prevention professional', service1body: 'Preventielijn van Offlimits offers anonymous contact. Visit the service for current phone and chat availability. Dutch-language service.',
    service2: 'Start with self-help', service2body: 'Stoppen is mogelijk offers a free, anonymous Dutch self-help module for people concerned about their viewing behaviour.',
    service3: 'Explore international support', service3body: 'ReDirection is an international self-help programme listed in the challenge brief. Check the programme for supported languages and terms.',
    visit: 'Visit the service', privacy: 'Your original submission is not sent to these services. Their own privacy policies apply when you visit.',
    country: 'Information for', netherlands: 'Netherlands', other: 'Other / unknown', countryHint: 'Country is a demo setting, not a location determination.',
    otherHint: 'No local legal information is shown for this country. Check the service directory for suitable support.',
    caption: 'There is space for a different next step.', safety: 'A route to human support. No judgement, no personal threats.',
  },
  nl: {
    demo: 'Ontwerpprototype · geen bezoekerstracking', leave: 'Verlaat deze pagina', support: 'Direct naar hulp',
    steps: ['Een moment om stil te staan', 'Begrijp de gevolgen', 'Vind je volgende stap'],
    eyebrow: 'JE VOLGENDE STAP TELT', learnTitle: 'Jouw keuzes kunnen kinderen beschermen.',
    learnBody: 'Materiaal van seksueel kindermisbruik brengt kinderen schade toe. Je kunt nu kiezen om er niet naar te zoeken en het niet te delen. Er is hulp als je je zorgen maakt over je gedachten of gedrag.',
    legalTitle: 'Juridische informatie voor Nederland',
    legalBody: 'Artikel 252 van het Wetboek van Strafrecht gaat over materiaal van seksueel kindermisbruik. De maximumgevangenisstraf is zes jaar, oplopend tot negen jaar bij gewoonte of beroepsmatig handelen.',
    source: 'Lees de officiële juridische informatie', next: 'Ontdek de hulp', back: 'Terug',
    helpTitle: 'Je hoeft dit niet alleen uit te zoeken.',
    helpBody: 'Kies een volgende stap die haalbaar voelt. Deze onafhankelijke diensten leggen hun hulp, beschikbaarheid en vertrouwelijkheid uit.',
    service1: 'Praat met een hulpverlener', service1body: 'De Preventielijn van Offlimits biedt anoniem contact. Bekijk bij de dienst wanneer telefoon en chat beschikbaar zijn. Nederlandstalige hulp.',
    service2: 'Begin met zelfhulp', service2body: 'Stoppen is mogelijk biedt een gratis, anonieme Nederlandstalige zelfhulpmodule voor mensen met zorgen over hun kijkgedrag.',
    service3: 'Ontdek internationale hulp', service3body: 'ReDirection is een internationaal zelfhulpprogramma uit de challengebrief. Bekijk bij het programma welke talen en voorwaarden gelden.',
    visit: 'Bezoek de dienst', privacy: 'Je oorspronkelijke invoer wordt niet naar deze diensten gestuurd. Bij een bezoek gelden hun eigen privacyvoorwaarden.',
    country: 'Informatie voor', netherlands: 'Nederland', other: 'Ander / onbekend', countryHint: 'Het land is een demo-instelling, geen locatiebepaling.',
    otherHint: 'Voor dit land tonen we geen lokale juridische informatie. Bekijk de hulpgids voor passende ondersteuning.',
    caption: 'Er is ruimte voor een andere volgende stap.', safety: 'Een weg naar menselijke hulp. Zonder oordeel of persoonlijke dreiging.',
  },
};

function result(outcome, helpServiceId = null) {
  const durationMs = Math.round(visibleMs + (visibleStart === null ? 0 : performance.now() - visibleStart));
  // Contract-compatible local event only. No network collection or storage.
  document.body.dispatchEvent(new CustomEvent('sbis:result', { detail: { shown: true, outcome, variantId: variant === 'B' ? 'reflection-first' : 'immediate-warning', helpServiceId, durationMs, timestamp: new Date().toISOString() } }));
}

function serviceCard(image, title, body, href, id) {
  return `<a class="support-card" href="${href}" target="_blank" rel="noopener noreferrer" data-service="${id}"><span class="support-icon">${icon(image, 23)}</span><div><h2>${title}</h2><p>${body}</p><span class="support-link">${ui[language].visit} ${icon('external', 14)}</span></div>${icon('arrow', 19)}</a>`;
}

function render() {
  const l = ui[language];
  document.documentElement.lang = language;
  document.title = `${l.steps[stage]} — Before`;
  root.innerHTML = `<div class="journey-demo">${l.demo}</div><header class="journey-header"><a class="brand" href="${returnPath}" aria-label="Before — ${l.leave}">${mark}<span>before.</span></a><div class="journey-header-actions"><div class="segmented" aria-label="Language"><button data-lang="en" class="${language === 'en' ? 'selected' : ''}" aria-pressed="${language === 'en'}">EN</button><button data-lang="nl" class="${language === 'nl' ? 'selected' : ''}" aria-pressed="${language === 'nl'}">NL</button></div><a class="exit-link" href="${returnPath}">${l.leave} ${icon('close', 16)}</a></div></header>
  <nav class="journey-progress" aria-label="${language === 'nl' ? 'Stappen' : 'Journey progress'}">${l.steps.map((name, i) => `<button data-stage="${i}" class="${i === stage ? 'current' : ''}" ${i === stage ? 'aria-current="step"' : ''}><span>${i < stage ? icon('check', 12) : `0${i + 1}`}</span><span>${name}</span></button>`).join('')}</nav>
  <main id="main" class="journey-main ${stage === 0 ? 'reflection' : stage === 2 ? 'support-stage' : 'education'}" tabindex="-1">
  ${stage === 0 ? `<div class="reflection-art">${landscape}<span>${l.caption}</span></div><section class="reflection-copy"><p class="eyebrow">${l.eyebrow}</p><h1>${esc(config[language].title)}</h1><p class="journey-body">${esc(config[language].body)}</p><div class="journey-cta"><button class="button primary next-stage">${esc(config[language].button)} ${icon('arrow', 18)}</button><button class="text-link direct-support">${l.support} ${icon('arrow', 15)}</button></div><p class="journey-reassurance">${icon('leaf', 17)} ${l.safety}</p></section>` : ''}
  ${stage === 1 ? `<section class="education-content"><p class="eyebrow">02 · ${l.steps[1]}</p><h1>${l.learnTitle}</h1><p class="journey-body">${l.learnBody}</p>${config.legal && country === 'NL' ? `<div class="legal-block">${icon('book', 23)}<div><h2>${l.legalTitle}</h2><p>${l.legalBody}</p><a href="${legalSource}" target="_blank" rel="noopener noreferrer">${l.source} ${icon('external', 13)}</a></div></div>` : country !== 'NL' ? `<p class="country-note">${l.otherHint}</p>` : ''}<div class="journey-cta"><button class="button primary next-stage">${l.next} ${icon('arrow', 18)}</button><button class="text-link" data-stage="0">${l.back}</button></div></section><aside class="education-aside">${landscape}<p>${l.caption}</p><button class="text-link direct-support">${l.support} ${icon('arrow', 16)}</button></aside>` : ''}
  ${stage === 2 ? `<div class="support-heading"><p class="eyebrow">03 · ${l.steps[2]}</p><h1>${l.helpTitle}</h1><p class="journey-body">${l.helpBody}</p></div><div class="support-cards">${country === 'NL' ? serviceCard('message', l.service1, l.service1body, 'https://preventielijn.offlimits.nl', 'offlimits-preventielijn') + serviceCard('book', l.service2, l.service2body, 'https://stoppen-is-mogelijk.eu', 'stoppen-is-mogelijk') : serviceCard('globe', l.service3, l.service3body, 'https://www.suojellaanlapsia.fi/en/redirection', 'redirection')}</div><p class="support-privacy">${icon('shield', 16)}${l.privacy}</p><button class="text-link back-education" data-stage="1">${l.back}</button>` : ''}
  </main><footer class="journey-footer"><label>${l.country}<select id="journey-country"><option value="NL" ${country === 'NL' ? 'selected' : ''}>${l.netherlands}</option><option value="OTHER" ${country === 'OTHER' ? 'selected' : ''}>${l.other}</option></select></label><span>${l.countryHint}</span>${stage !== 2 ? `<button class="text-link direct-support">${l.support} ${icon('arrow', 14)}</button>` : ''}</footer>`;
  root.querySelectorAll('[data-lang]').forEach(button => button.onclick = () => { language = button.dataset.lang; render(); });
  root.querySelectorAll('[data-stage]').forEach(button => button.onclick = () => go(Number(button.dataset.stage)));
  root.querySelectorAll('.next-stage').forEach(button => button.onclick = () => go(Math.min(stage + 1, 2)));
  root.querySelectorAll('.direct-support').forEach(button => button.onclick = () => go(2));
  root.querySelectorAll('[data-service]').forEach(link => link.addEventListener('click', () => result('clicked_help', link.dataset.service)));
  root.querySelectorAll('.exit-link,.journey-header .brand').forEach(link => link.addEventListener('click', () => result('left_page')));
  root.querySelector('#journey-country').onchange = e => { country = e.target.value; render(); };
}

function go(next) {
  stage = next; render(); window.scrollTo(0, 0); root.querySelector('h1')?.focus({ preventScroll: true });
}

async function init() {
  try {
    const response = await fetch('/api/demo/config');
    if (response.ok) config = await response.json();
    const experimentsResponse = await fetch('/api/demo/experiments');
    if (experimentsResponse.ok) {
      const experiment = (await experimentsResponse.json()).find(e => e.id === 'reflection-first' && e.status === 'running');
      if (experiment) variant = Math.random() * 100 < experiment.allocation ? 'B' : 'A';
    }
  } catch { /* Bundled content remains available if the demo backend is offline. */ }
  if (params.get('variant') === 'A' || params.get('variant') === 'B') variant = params.get('variant');
  country = params.get('country') === 'NL' ? 'NL' : params.get('country') === 'OTHER' ? 'OTHER' : config.country;
  stage = variant === 'A' ? 1 : 0;
  render();
  root.querySelector('h1')?.setAttribute('tabindex', '-1');
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && visibleStart !== null) { visibleMs += performance.now() - visibleStart; visibleStart = null; }
  else if (document.visibilityState === 'visible' && visibleStart === null) visibleStart = performance.now();
});
init();
