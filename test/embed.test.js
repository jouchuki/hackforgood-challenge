import test from 'node:test';
import assert from 'node:assert/strict';
import { createBefore, isSyntheticMatch, normalizeTrigger, supportedLanguage } from '../packages/browser/src/index.js';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { BeforeProvider, BeforeForm } from '../packages/react/src/index.js';

class DocumentFixture extends EventTarget {
  querySelector() { return null; }
}
class FormFixture extends EventTarget {
  constructor(value) { super(); this.input = { value }; }
  querySelector() { return this.input; }
}
const config = { arms: [{ id: 'default', weight: 100, intervention: {} }] };
const response = { ok: true, json: async () => config };
const tick = () => new Promise(resolve => setImmediate(resolve));

test('browser language fallback and synthetic matching are explicit', () => {
  assert.equal(supportedLanguage(['de-DE', 'nl-NL', 'en']), 'nl');
  assert.equal(supportedLanguage(['fr']), 'en');
  assert.equal(isSyntheticMatch(' TEST-TRIGGER-RED '), true);
  assert.equal(isSyntheticMatch('a normal community search'), false);
  assert.deepEqual(normalizeTrigger({ type: 'search', severity: 'high', text: 'must never be forwarded', userId: 'forbidden', country: 'NL', language: 'nl-NL' }), { type: 'search', severity: 'high', language: 'nl', country: 'NL' });
  assert.equal(normalizeTrigger({ type: 'anything', severity: 'high' }), null);
});

test('initialization is idempotent, cookie-free, and keeps early metadata-only triggers', async () => {
  const doc = new DocumentFixture();
  const requests = [];
  const navigations = [];
  let release;
  const client = createBefore({ document: doc, languages: ['nl-NL'], navigate: value => navigations.push(value), fetch: (url, options) => { requests.push({ url, options }); return new Promise(resolve => { release = resolve; }); } });
  const settings = { endpoint: 'http://localhost:3000', siteId: 'demo-forum' };
  const ready = client.init(settings);
  assert.equal(client.init(settings), ready);
  doc.dispatchEvent(new CustomEvent('sbis:trigger', { detail: { type: 'search', severity: 'high', text: 'private input', sessionId: 'never-forwarded' } }));
  release(response);
  await ready;
  await tick();
  assert.equal(requests.length, 1);
  assert.equal(requests[0].options.credentials, 'omit');
  assert.equal(requests[0].options.referrerPolicy, 'no-referrer');
  assert.equal(navigations.length, 1);
  const url = new URL(navigations[0]);
  assert.equal(url.pathname, '/intervention/demo-forum');
  assert.equal(url.searchParams.get('lang'), 'nl');
  assert.equal(url.searchParams.has('text'), false);
  assert.equal(url.searchParams.has('sessionId'), false);
  assert.equal(navigations[0].includes('private'), false);
  client.destroy();
});

test('bound forms preserve ordinary submits and cancel only explicit fake matches', async () => {
  const navigations = [];
  const client = createBefore({ document: new DocumentFixture(), fetch: async () => response, navigate: value => navigations.push(value), languages: ['en'] });
  await client.init({ endpoint: 'http://localhost:3000', siteId: 'demo-fieldnotes', demo: true });
  const form = new FormFixture('a book club');
  const unbind = client.bind(form, { demo: true });
  assert.equal(client.bind(form, { demo: true }), unbind);
  assert.equal(form.dispatchEvent(new Event('submit', { cancelable: true })), true);
  assert.equal(navigations.length, 0);
  form.input.value = 'test-trigger-amber';
  assert.equal(form.dispatchEvent(new Event('submit', { cancelable: true })), false);
  await tick();
  assert.equal(navigations.length, 1);
  assert.equal(navigations[0].includes('test-trigger'), false);
  unbind();
  assert.equal(form.dispatchEvent(new Event('submit', { cancelable: true })), true);
  client.destroy();
});

test('destroy removes listeners, cancels bindings, and prevents a queued redirect', async () => {
  const doc = new DocumentFixture();
  const navigations = [];
  let release;
  const client = createBefore({ document: doc, languages: ['en'], navigate: value => navigations.push(value), fetch: () => new Promise(resolve => { release = resolve; }) });
  const ready = client.init({ endpoint: 'http://localhost:3000', siteId: 'demo-forum', demo: true });
  const form = new FormFixture('test-trigger-red');
  client.bind(form, { demo: true });
  const pending = client.intervene({ type: 'search', severity: 'high' }).catch(() => false);
  client.destroy();
  release(response);
  await assert.rejects(ready);
  await pending;
  doc.dispatchEvent(new CustomEvent('sbis:trigger', { detail: { type: 'search', severity: 'high' } }));
  assert.equal(form.dispatchEvent(new Event('submit', { cancelable: true })), true);
  assert.equal(navigations.length, 0);
  assert.equal(client.ready, false);
});

test('invalid configuration and non-demo form binding fail without navigation', async () => {
  const client = createBefore({ document: new DocumentFixture(), fetch: async () => response, navigate: () => assert.fail('must not navigate') });
  await assert.rejects(client.init({ endpoint: 'javascript:invalid', siteId: 'demo-forum' }));
  await assert.rejects(client.init({ endpoint: 'http://localhost:3000', siteId: '../escape' }));
  await client.init({ endpoint: 'http://localhost:3000', siteId: 'demo-forum' });
  assert.throws(() => client.bind(new FormFixture('test-trigger-red')), /explicit synthetic demo/);
  assert.equal(await client.intervene({ type: 'search', severity: 'not-valid' }), false);
  client.destroy();
});

test('React wrapper renders server-side without a browser or network access', () => {
  const html = renderToString(createElement(BeforeProvider, { endpoint: 'http://localhost:3000', siteId: 'demo-forum' }, createElement(BeforeForm, { demo: true }, createElement('input', { type: 'search', name: 'q' }))));
  assert.match(html, /<form/);
  assert.match(html, /name="q"/);
});

test('a failed configuration load can be retried with the same installation settings', async () => {
  let requests = 0;
  const client = createBefore({ document: new DocumentFixture(), fetch: async () => { requests += 1; return requests === 1 ? { ok: false } : response; }, navigate: () => {} });
  const settings = { endpoint: 'http://localhost:3000', siteId: 'demo-forum' };
  await assert.rejects(client.init(settings));
  await client.init(settings);
  assert.equal(client.ready, true);
  assert.equal(requests, 2);
  client.destroy();
});
