import '@fontsource-variable/dm-sans';
import '@fontsource-variable/newsreader';
import { chooseArm, COUNTERS, preferredLanguage, escapeHtml as esc } from '../core/model.js';
import { renderJourney } from './renderer.js';

const container = document.querySelector('#journey');
const query = new URLSearchParams(location.search);
const diagnosticToken = /^[a-f0-9]{32}$/.test(query.get('before_check') || '') ? query.get('before_check') : null;
const unmeasured = query.get('preview') === '1' || diagnosticToken !== null;
const siteId = location.pathname.match(/^\/intervention\/([a-zA-Z0-9_-]+)\/?$/)?.[1] || 'demo-forum';
const language = preferredLanguage([query.get('lang'), ...(navigator.languages || [])]);
const endpoint = `/api/public/sites/${encodeURIComponent(siteId)}`;
let snapshot;
let arm;
let renderer;
let shown = false;
let finished = false;
let currentStage;
let visibleStarted = null;
let visibleDuration = 0;
let countryRequest = 0;
let engagementMeasured = false;
let pathMeasured = false;
const pathConnections = new Set();
let scrolled = false;
let educationEndViewed = false;
let scrollIntentUntil = 0;
let lastScrollPosition = document.scrollingElement?.scrollTop || 0;
const stages = new Set();
const labels = language === 'nl' ? {
  loading: 'Een moment. We openen de informatie en ondersteuning.', help: 'Direct naar de hulpgids', error: 'De interventie kon niet worden geladen.', retry: 'Probeer opnieuw', detail: 'Je kunt de hulpgids nog steeds openen. Je oorspronkelijke invoer wordt niet doorgestuurd.',
} : {
  loading: 'One moment. Opening information and support.', help: 'Go straight to the help directory', error: 'The intervention could not be loaded.', retry: 'Try again', detail: 'You can still open the help directory. Your original submission is not forwarded.',
};
document.documentElement.lang = language;
document.title = language === 'nl' ? 'Een moment om te kiezen — Next Step' : 'A moment to choose — Next Step';

function helpPath() {
  const params = new URLSearchParams({ lang: language });
  if (/^[A-Z]{2}$/.test(query.get('country') || '')) params.set('country', query.get('country'));
  return `/help?${params}`;
}

function record(counts, keepalive = false) {
  if (unmeasured || !snapshot || !arm) return;
  const allowed = Object.fromEntries(Object.entries(counts).filter(([key, value]) => COUNTERS.includes(key) && Number.isInteger(value) && value > 0));
  if (!Object.keys(allowed).length) return;
  // Counter deltas only: no original text, user identifiers, or event history.
  fetch(`${endpoint}/metrics`, {
    method: 'POST', credentials: 'omit', referrerPolicy: 'no-referrer', keepalive,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ schemaVersion: 1, studyRevision: snapshot.studyRevision, armId: arm.id, reportingDay: snapshot.reportingDay, source: 'demo_interaction', counts: allowed }),
  }).catch(() => {});
}

function accountVisibleTime() {
  if (visibleStarted !== null) { visibleDuration += performance.now() - visibleStarted; visibleStarted = null; }
}

function markVisible() {
  if (finished || !renderer || document.visibilityState !== 'visible') return;
  if (visibleStarted === null) visibleStarted = performance.now();
  const counts = {};
  if (!shown) { shown = true; counts.shown = 1; }
  if (!pathMeasured) { pathMeasured = true; counts.path_measured = 1; }
  if (currentStage && !stages.has(currentStage)) { stages.add(currentStage); counts[`${currentStage}_viewed`] = 1; }
  if (currentStage === 'education' && !engagementMeasured) { engagementMeasured = true; counts.engagement_measured = 1; }
  record(counts);
}

function recordConnection(from,to) {
  if (!from || from === to || finished || unmeasured) return;
  const key=`path_${from}_${to}`;
  if (!COUNTERS.includes(key) || pathConnections.has(key)) return;
  pathConnections.add(key);record({[key]:1});
}

function scrollIntent(event) {
  if (!event.isTrusted || finished || (currentStage !== 'education' || renderer?.educationVisible === false) || document.visibilityState !== 'visible') return;
  if (event.type === 'keydown' && (!['ArrowDown','ArrowUp','PageDown','PageUp','Home','End',' '].includes(event.key) || /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName))) return;
  scrollIntentUntil = performance.now() + 1400;
}

function recordScroll(event) {
  const position = document.scrollingElement?.scrollTop || 0;
  const changed = position !== lastScrollPosition;
  lastScrollPosition = position;
  if (scrolled || finished || unmeasured || !event.isTrusted || !changed || currentStage !== 'education' || document.visibilityState !== 'visible' || performance.now() > scrollIntentUntil || document.querySelector('dialog[open]')) return;
  scrolled = true;
  record({ scrolled: 1 });
}

function contentEnd(stage) {
  if (stage !== 'education' || educationEndViewed || finished || unmeasured || document.visibilityState !== 'visible') return;
  markVisible();
  educationEndViewed = true;
  record({ education_end_viewed: 1 });
}

function finish(outcome = 'exited') {
  if (finished || !shown) return;
  finished = true;
  accountVisibleTime();
  const seconds = visibleDuration / 1000;
  const durationKey = seconds < 10 ? 'duration_lt10' : seconds < 30 ? 'duration_10to30' : seconds < 60 ? 'duration_30to60' : 'duration_gte60';
  record({ [outcome]: 1, [durationKey]: 1 }, true);
}

function exit() {
  finish('dismissed');
  let destination;
  try {
    destination = new URL(snapshot.site?.returnUrl || '/demo/forum', location.origin);
    if (!['http:', 'https:'].includes(destination.protocol) || destination.username || destination.password) throw new Error();
  } catch { destination = new URL('/demo/forum', location.origin); }
  location.assign(destination.href);
}

async function changeCountry(next) {
  const requestId = ++countryRequest;
  renderer.updateContext({ country: next, services: [], legalPack: null });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const params = new URLSearchParams({ lang: renderer.language, country: next });
    const response = await fetch(`${endpoint}/config?${params}`, { credentials: 'omit', referrerPolicy: 'no-referrer', signal: controller.signal });
    if (!response.ok) return;
    const context = await response.json();
    if (requestId !== countryRequest) return;
    // Keep the exposure's authored intervention and revision pinned; update routing context only.
    renderer.updateContext({ country: context.country || next, services: context.services || [], legalPack: context.legalPack || null });
  } catch { /* The permanent /help link remains available. */ }
  finally { clearTimeout(timeout); }
}

async function start() {
  container.innerHTML = `<main class="before-loading"><p role="status">${labels.loading}</p><a href="${helpPath()}">${labels.help}</a></main>`;
  const params = new URLSearchParams({ lang: language });
  const country = query.get('country');
  if (/^[A-Z]{2}$/.test(country || '') || country === 'UNKNOWN') params.set('country', country);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`${endpoint}/config?${params}`, { credentials: 'omit', referrerPolicy: 'no-referrer', signal: controller.signal });
    if (!response.ok) throw new Error();
    snapshot = await response.json();
    if (!Array.isArray(snapshot.arms) || !snapshot.arms.length) throw new Error();
    arm = chooseArm(snapshot.arms);
    if (!arm?.intervention) throw new Error();
    renderer = renderJourney(container, arm.intervention, {
      language, country: snapshot.country || 'UNKNOWN', services: snapshot.services || [], legalPack: snapshot.legalPack, unmeasured,
      onStage(stage) { recordConnection(currentStage,stage); currentStage = stage; markVisible(); },
      onContentEnd: contentEnd,
      onInlineNavigation() { scrollIntentUntil=0; },
      onSupportVisible() { if(finished||unmeasured||document.visibilityState!=='visible'||stages.has('support'))return;stages.add('support');recordConnection('education','support');record({support_viewed:1}); },
      onLanguage(next) { document.documentElement.lang = next; },
      onCountry: changeCountry,
      onHelp() { finish('help_selected'); },
      onExit: exit,
    });
    currentStage = renderer.stage;
    markVisible();
    if (diagnosticToken) fetch(`${endpoint}/deployment-check`, {
      method: 'POST', credentials: 'omit', referrerPolicy: 'no-referrer',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: diagnosticToken, step: 'rendered' }),
    }).catch(() => {});
  } catch {
    container.innerHTML = `<main class="before-loading"><h1>${labels.error}</h1><p>${labels.detail}</p><button id="retry-journey">${labels.retry}</button><a href="${esc(helpPath())}">${labels.help}</a></main>`;
    container.querySelector('#retry-journey').onclick = start;
  } finally { clearTimeout(timeout); }
}

document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' ? accountVisibleTime() : markVisible());
document.addEventListener('wheel', scrollIntent, { passive: true });
document.addEventListener('touchmove', scrollIntent, { passive: true });
document.addEventListener('keydown', scrollIntent);
document.addEventListener('scroll', recordScroll, { passive: true });
window.addEventListener('pagehide', () => finish());
window.addEventListener('pageshow', event => { if (event.persisted) location.reload(); });
start();
