import fakeEntries from '../../../mock-platform/fake-triggers.json' with { type: 'json' };

const TYPES = new Set(['search', 'chat', 'navigation']);
const SEVERITIES = new Set(['low', 'medium', 'high']);
export const isSyntheticMatch = value => typeof value === 'string' && fakeEntries.some(entry => entry.term.toLowerCase() === value.trim().toLowerCase());

export function supportedLanguage(languages = []) {
  for (const value of languages) {
    const code = String(value || '').toLowerCase().split('-')[0];
    if (code === 'nl' || code === 'en') return code;
  }
  return 'en';
}

export function normalizeTrigger(value) {
  if (!value || !TYPES.has(value.type) || !SEVERITIES.has(value.severity)) return null;
  return {
    type: value.type, severity: value.severity,
    ...(typeof value.language === 'string' ? { language: supportedLanguage([value.language]) } : {}),
    ...(typeof value.country === 'string' && (/^[A-Z]{2}$/.test(value.country) || value.country === 'UNKNOWN') ? { country: value.country } : {}),
  };
}

/** Explicit adapter only: no general input surveillance, storage, or detection service. */
export function createBefore(environment = {}) {
  const doc = environment.document ?? globalThis.document;
  const fetcher = environment.fetch ?? globalThis.fetch?.bind(globalThis);
  const navigate = environment.navigate ?? (url => globalThis.location.assign(url));
  const languages = environment.languages ?? globalThis.navigator?.languages ?? ['en'];
  const currentLocation = environment.location ?? globalThis.location;
  let checkToken = null;
  try { const value = new URL(currentLocation?.href).searchParams.get('before_check'); if (/^[a-f0-9]{32}$/.test(value || '')) checkToken = value; } catch {}
  let settings = null;
  let config = null;
  let readiness = null;
  let active = false;
  let navigating = false;
  let failed = false;
  let generation = 0;
  let requestController;
  const bindings = new Map();

  const checkReceipt = step => {
    if (!checkToken || !settings || !active) return Promise.resolve();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    return fetcher(`${settings.endpoint}/api/public/sites/${encodeURIComponent(settings.siteId)}/deployment-check`, { method: 'POST', credentials: 'omit', referrerPolicy: 'no-referrer', keepalive: true, signal: controller.signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: checkToken, step }) }).catch(() => {}).finally(() => clearTimeout(timeout));
  };
  const checkSubmission = () => { if (config) checkReceipt('submitted'); };
  const listener = event => { if (active) intervene(event.detail).catch(() => {}); };

  function init(options = {}) {
    if (!doc || !fetcher) return Promise.reject(new Error('Before needs a browser document and fetch implementation.'));
    const base = options.endpoint || globalThis.location?.origin;
    let endpoint;
    try {
      const parsed = new URL(base);
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
      endpoint = parsed.origin;
    } catch { return Promise.reject(new Error('Provide an HTTP(S) endpoint.')); }
    if (!/^[a-zA-Z0-9_-]{1,80}$/.test(options.siteId || '')) return Promise.reject(new Error('Provide a valid siteId.'));
    const next = { endpoint, siteId: options.siteId, language: supportedLanguage([options.language, ...languages]), country: options.country, demo: options.demo === true };
    const key = JSON.stringify(next);
    if (active && settings?.key === key && !failed) return readiness;
    destroy();
    active = true;
    navigating = false;
    failed = false;
    settings = { ...next, key };
    const currentGeneration = ++generation;
    doc.addEventListener('sbis:trigger', listener, { capture: true });
    if (checkToken) doc.addEventListener('submit', checkSubmission, { capture: true });
    const controller = new AbortController();
    requestController = controller;
    const query = new URLSearchParams({ lang: next.language });
    if (/^[A-Z]{2}$/.test(next.country || '') || next.country === 'UNKNOWN') query.set('country', next.country);
    const timeout = setTimeout(() => controller.abort(), 8000);
    readiness = fetcher(`${endpoint}/api/public/sites/${encodeURIComponent(next.siteId)}/config?${query}`, {
      credentials: 'omit', referrerPolicy: 'no-referrer', signal: controller.signal,
    }).then(async response => {
      if (!response.ok) throw new Error('Before configuration is unavailable.');
      const received = await response.json();
      if (!active || currentGeneration !== generation) throw new Error('Before was disposed.');
      if (!Array.isArray(received.arms) || received.arms.length < 1) throw new Error('Before configuration is incomplete.');
      config = received;
      await checkReceipt('sdk');
      return received;
    }).catch(error => { if (currentGeneration === generation) failed = true; throw error; }).finally(() => clearTimeout(timeout));
    // Prevent an event-only installation from emitting an unhandled rejection.
    readiness.catch(() => {});
    return readiness;
  }

  async function intervene(value = { type: 'navigation', severity: 'medium' }) {
    const trigger = normalizeTrigger(value);
    if (!active || !trigger || navigating) return false;
    const currentGeneration = generation;
    await readiness;
    if (!active || currentGeneration !== generation || navigating) return false;
    navigating = true;
    const destination = new URL(`/intervention/${encodeURIComponent(settings.siteId)}`, settings.endpoint);
    destination.searchParams.set('lang', supportedLanguage([trigger.language, settings.language]));
    const country = trigger.country || settings.country;
    if (/^[A-Z]{2}$/.test(country || '') || country === 'UNKNOWN') destination.searchParams.set('country', country);
    if (checkToken) {
      await checkReceipt('submitted');
      destination.searchParams.set('before_check', checkToken);
      destination.searchParams.set('preview', '1');
    }
    // Only fixed, metadata fields are forwarded; the original text never leaves the form.
    navigate(destination.href);
    return true;
  }

  function bind(formOrSelector, options = {}) {
    if (!active) throw new Error('Call Before.init before binding a form.');
    const form = typeof formOrSelector === 'string' ? doc.querySelector(formOrSelector) : formOrSelector;
    if (!form?.addEventListener) throw new Error('The configured form was not found.');
    if (bindings.has(form)) return bindings.get(form).cleanup;
    if (!(options.demo === true || settings.demo)) throw new Error('Submission matching is available only in explicit synthetic demo mode. Production platforms must supply sbis:trigger metadata.');
    const handler = event => {
      const input = form.querySelector(options.input || 'input[type="search"], input[name="q"], input[name="s"], textarea');
      if (!isSyntheticMatch(input?.value || '')) return;
      event.preventDefault();
      // Cancelling a native submit is intentional; no source input enters the request URL.
      intervene({ type: options.type || 'search', severity: 'high' }).catch(() => {
        doc.dispatchEvent(new CustomEvent('before:error', { detail: { message: 'The support page could not be opened. Try again.' } }));
      });
    };
    const cleanup = () => { form.removeEventListener('submit', handler, { capture: true }); bindings.delete(form); };
    form.addEventListener('submit', handler, { capture: true });
    bindings.set(form, { cleanup });
    return cleanup;
  }

  function destroy() {
    active = false;
    generation += 1;
    navigating = false;
    requestController?.abort();
    requestController = null;
    doc?.removeEventListener('sbis:trigger', listener, { capture: true });
    doc?.removeEventListener('submit', checkSubmission, { capture: true });
    for (const binding of [...bindings.values()]) binding.cleanup();
    config = null;
    settings = null;
    readiness = null;
  }

  return { init, intervene, bind, bindForm: bind, destroy, get config() { return config; }, get ready() { return active && Boolean(config); } };
}

export const Before = typeof document !== 'undefined' ? createBefore() : null;

if (typeof window !== 'undefined' && Before) {
  if (!window.Before) window.Before = Before;
  const script = document.currentScript;
  if (script?.dataset.site) {
    const instance = window.Before;
    instance.init({ siteId: script.dataset.site, endpoint: script.dataset.endpoint || new URL(script.src).origin, country: script.dataset.country, language: script.dataset.language, demo: script.dataset.demo === 'true' }).then(() => {
      if (script.dataset.form) instance.bind(script.dataset.form, { input: script.dataset.input, demo: script.dataset.demo === 'true' });
    }).catch(() => document.dispatchEvent(new CustomEvent('before:error', { detail: { message: 'Next Step could not load its configuration.' } })));
  }
}
