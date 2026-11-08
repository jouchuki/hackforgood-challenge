import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import http from 'node:http';
import { once } from 'node:events';
import { createApp } from '../server/app.js';
import { createGateway } from '../gateway/proxy.js';
import { newStudy } from '../core/model.js';
import { today } from '../server/store.js';

const gatewayKey = 'test-infrastructure-key-not-a-user-identifier';
async function listen(server) {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return `http://127.0.0.1:${server.address().port}`;
}
async function close(server) {
  server.closeAllConnections?.();
  await new Promise(resolve => server.close(resolve));
}
async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'before-backend-'));
  const storePath = join(directory, 'state.json');
  let app = createApp({ storePath, gatewayKey });
  let server = http.createServer(app);
  let origin = await listen(server);
  t.after(async () => { await close(server); await rm(directory, { recursive: true, force: true }); });
  const sessions = {};
  const call = async (path, { method = 'GET', body, role, headers = {}, raw = false } = {}) => {
    const response = await fetch(`${origin}${path}`, { method, headers: { 'x-before-gateway-key': gatewayKey, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(role && sessions[role] ? { Cookie: sessions[role] } : {}), ...headers }, ...(body === undefined ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }) });
    if (raw) return response;
    const data = await response.json(); return { status: response.status, data, response };
  };
  const login = async role => {
    const { response, status } = await call('/api/session', { method: 'POST', body: { role } });
    assert.equal(status, 200);
    sessions[role] = response.headers.get('set-cookie').split(';')[0];
    return sessions[role];
  };
  return { call, login, sessions, storePath, app: () => app, origin: () => origin, restart: async () => { await close(server); app = createApp({ storePath, gatewayKey }); server = http.createServer(app); origin = await listen(server); } };
}
const configPath = '/api/public/sites/demo-forum/config';
const metricPath = '/api/public/sites/demo-forum/metrics';
const metrics = (counts, extra = {}) => ({ studyRevision: 'site:demo-forum@1', armId: 'default', reportingDay: today(), source: 'demo_interaction', counts, ...extra });

test('gateway requirement and separate local role sessions are enforced', async t => {
  const f = await fixture(t);
  assert.equal((await fetch(`${f.origin()}/api/health`)).status, 403);
  assert.equal((await f.call('/api/moderator/sites')).status, 403);
  await f.login('researcher');
  assert.equal((await f.call('/api/researcher/studies', { role: 'researcher' })).status, 200);
  assert.equal((await f.call('/api/moderator/sites', { role: 'researcher' })).status, 403);
  const moderatorCookie = await f.login('moderator');
  assert.equal((await f.call('/api/moderator/sites', { role: 'moderator' })).status, 200);
  assert.match(moderatorCookie, /^before_moderator=/);
  for (const suffix of ['metrics', 'export']) assert.equal((await f.call(`/api/moderator/sites/demo-forum/${suffix}`, { role: 'moderator' })).status, 404);
  assert.equal((await f.call('/api/moderator/sites/demo-forum/simulate', { role: 'moderator', method: 'POST', body: { volume: 100, seed: 'removed' } })).status, 404);
  assert.equal((await f.call('/api/researcher/studies', { role: 'moderator' })).status, 403);
  assert.equal((await f.call('/api/session', { method: 'POST', body: { role: 'moderator' }, headers: { Origin: 'https://unapproved.example' } })).status, 403);
});

test('drafts stay private; publication and revert survive an application restart', async t => {
  const f = await fixture(t); await f.login('moderator');
  const before = (await f.call(configPath)).data;
  const draft = (await f.call('/api/moderator/sites/demo-forum/draft', { role: 'moderator' })).data;
  draft.en.title = 'A published change in the synthetic demo';
  assert.equal((await f.call('/api/moderator/sites/demo-forum/draft', { method: 'PUT', body: draft, role: 'moderator' })).status, 200);
  assert.equal((await f.call(configPath)).data.arms[0].intervention.en.title, before.arms[0].intervention.en.title);
  const published = await f.call('/api/moderator/sites/demo-forum/publish', { method: 'POST', body: {}, role: 'moderator' });
  assert.equal(published.data.activePublication, 'site:demo-forum@2');
  await f.restart();
  assert.equal((await f.call(configPath)).data.arms[0].intervention.en.title, draft.en.title);
  const reverted = await f.call('/api/moderator/sites/demo-forum/revert', { method: 'POST', body: { publicationKey: 'site:demo-forum@1' }, role: 'moderator' });
  assert.equal(reverted.data.activePublication, 'site:demo-forum@1');
  assert.equal(reverted.data.publications.length, 2);
});

test('authored study content only routes after explicit moderator opt-in and remains revision-pinned', async t => {
  const f = await fixture(t); await f.login('moderator'); await f.login('researcher');
  const draft = newStudy('An authored study');
  draft.arms[1].intervention.en.title = 'A genuinely custom variant';
  const created = (await f.call('/api/researcher/studies', { method: 'POST', role: 'researcher', body: draft })).data;
  assert.equal(created.status, 'draft');
  assert.equal((await f.call(configPath)).data.arms[0].id, 'default');
  const published = (await f.call(`/api/researcher/studies/${created.id}/publish`, { method: 'POST', role: 'researcher', body: {} })).data;
  const publication = published.publications[0];
  assert.equal((await f.call(configPath)).data.arms[0].id, 'default');
  const enrol = await f.call('/api/moderator/sites/demo-forum/enrolment', { method: 'PUT', role: 'moderator', body: { studyRevision: publication.key, enabled: true } });
  assert.equal(enrol.status, 200);
  const active = (await f.call(configPath)).data;
  assert.equal(active.studyRevision, publication.key);
  assert.equal(active.arms[1].intervention.en.title, draft.arms[1].intervention.en.title);
  draft.arms[1].intervention.en.title = 'A later draft does not rewrite history';
  await f.call(`/api/researcher/studies/${created.id}`, { method: 'PUT', role: 'researcher', body: draft });
  await f.call(`/api/researcher/studies/${created.id}/publish`, { method: 'POST', role: 'researcher', body: {} });
  assert.equal((await f.call(configPath)).data.studyRevision, publication.key);
  await f.call(`/api/researcher/studies/${created.id}/status`, { method: 'PATCH', role: 'researcher', body: { status: 'paused' } });
  assert.equal((await f.call(configPath)).data.arms[0].id, 'default');
  const sourceText = await readFile(f.storePath, 'utf8');
  assert.match(sourceText, /A genuinely custom variant/);
});

test('collector stores only allowed aggregate deltas and validates day, context, source, and fields', async t => {
  const f = await fixture(t);
  const rejected = [
    metrics({ shown: -1 }), metrics({ shown: 1.5 }), metrics({ shown: 10001 }), metrics({ shown: 1, originalText: 1 }),
    metrics({ shown: 1 }, { source: 'simulation' }), metrics({ shown: 1 }, { reportingDay: '2000-01-01' }),
    { ...metrics({ shown: 1 }), ip: '192.0.2.55' }, { ...metrics({ shown: 1 }), originalText: 'PRIVATE-DEMO-SENTINEL' },
    metrics({ shown: 1 }, { studyRevision: 'missing', armId: 'A' }),
  ];
  for (const body of rejected) assert.equal((await f.call(metricPath, { method: 'POST', body })).status, 400);
  const unsafe = '{"studyRevision":"site:demo-forum@1","armId":"default","reportingDay":"' + today() + '","source":"demo_interaction","counts":{"shown":1,"__proto__":{"bad":1}}}';
  assert.equal((await f.call(metricPath, { method: 'POST', body: unsafe })).status, 400);
  const previousDay = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  assert.equal((await f.call(metricPath, { method: 'POST', body: metrics({ shown: 1 }, { reportingDay: previousDay }) })).status, 200);
  const stored = await readFile(f.storePath, 'utf8');
  assert.doesNotMatch(stored, /PRIVATE-DEMO-SENTINEL|192\.0\.2\.55|originalText|reportingDay|userAgent|visitorId/);
  const bucket = Object.values(JSON.parse(stored).buckets).find(b => b.source === 'demo_interaction');
  assert.equal(bucket.day, previousDay);
  assert.equal(bucket.counts.shown, 1);
});

test('small counts and derived values remain suppressed across API and CSV; concurrent writes persist', async t => {
  const f = await fixture(t); await f.login('moderator'); await f.login('researcher');
  await f.call('/api/moderator/sites/demo-forum/enrolment', { method: 'PUT', role: 'moderator', body: { studyRevision: 'reflection-first@1', enabled: true } });
  const reportPath = '/api/researcher/studies/reflection-first/metrics?source=demo_interaction';
  const studyMetrics = counts => metrics(counts, { studyRevision: 'reflection-first@1', armId: 'A' });
  await f.call(metricPath, { method: 'POST', body: studyMetrics({ shown: 9, help_selected: 1 }) });
  let report = (await f.call(reportPath, { role: 'researcher' })).data;
  assert.equal(report.rows[0].counts.shown, null);
  assert.equal(report.rows[0].counts.help_selected, null);
  assert.equal(report.rows[0].rates.help_rate, null);
  await Promise.all(Array.from({ length: 11 }, () => f.call(metricPath, { method: 'POST', body: studyMetrics({ shown: 1 }) })));
  await f.restart();
  report = (await f.call(reportPath, { role: 'researcher' })).data;
  assert.equal(report.rows[0].counts.shown, 20);
  assert.equal(report.rows[0].counts.help_selected, null);
  assert.equal(report.totals.rates.help_rate, null);
  const response = await f.call('/api/researcher/studies/reflection-first/export?source=demo_interaction', { role: 'researcher', raw: true });
  const csv = await response.text();
  assert.match(csv, /demo_interaction/);
  assert.doesNotMatch(csv, /"1"/);
});

test('simulation uses actual aggregation path, explicit source, and reproducible assumptions', async t => {
  const f = await fixture(t); await f.login('presenter');
  const first = await f.call('/api/presenter/sites/demo-fieldnotes/simulate', { method: 'POST', role: 'presenter', body: { volume: 200, seed: 'neutral', helpRates: { A: 0.1, B: 0.1 }, days: 3 } });
  assert.equal(first.status, 200);
  const before = (await f.call('/api/presenter/sites/demo-fieldnotes/metrics?source=simulation', { role: 'presenter' })).data;
  assert.equal(before.totals.counts.shown, 200);
  assert.equal(before.days.length, 3);
  const firstRawHelp = Object.values(JSON.parse(await readFile(f.storePath, 'utf8')).buckets).filter(bucket => bucket.siteId === 'demo-fieldnotes' && bucket.source === 'simulation').reduce((sum, bucket) => sum + bucket.counts.help_selected, 0);
  const interactive = (await f.call('/api/presenter/sites/demo-fieldnotes/metrics?source=demo_interaction', { role: 'presenter' })).data;
  assert.equal(interactive.rows.length, 0);
  await f.call('/api/presenter/sites/demo-fieldnotes/simulate', { method: 'POST', role: 'presenter', body: { volume: 200, seed: 'neutral', helpRates: { A: 0.1, B: 0.1 }, days: 3 } });
  const after = (await f.call('/api/presenter/sites/demo-fieldnotes/metrics?source=simulation', { role: 'presenter' })).data;
  assert.equal(after.totals.counts.shown, 400);
  const secondRawHelp = Object.values(JSON.parse(await readFile(f.storePath, 'utf8')).buckets).filter(bucket => bucket.siteId === 'demo-fieldnotes' && bucket.source === 'simulation').reduce((sum, bucket) => sum + bucket.counts.help_selected, 0);
  assert.equal(secondRawHelp, firstRawHelp * 2);
});

test('approved-origin CORS and no-JavaScript help function independently of visitor scripts', async t => {
  const f = await fixture(t);
  const allowed = await f.call(configPath, { headers: { Origin: 'http://localhost:9400' } });
  assert.equal(allowed.status, 200);
  assert.equal(allowed.response.headers.get('access-control-allow-origin'), 'http://localhost:9400');
  assert.equal((await f.call(configPath, { headers: { Origin: 'https://unapproved.example' } })).status, 403);
  const help = await f.call('/help?lang=nl&country=NL', { raw: true });
  const html = await help.text();
  assert.equal(help.status, 200);
  assert.match(html, /lang="nl"/);
  assert.match(html, /preventielijn\.offlimits\.nl/);
  assert.doesNotMatch(html, /<script/);
  const unknown = await f.call('/help?lang=en&country=UNKNOWN', { raw: true });
  assert.doesNotMatch(await unknown.text(), /maximum prison sentence/);
});

test('owned gateway strips spoofed IP/referrer/country headers and injects only trusted country context', async t => {
  const upstream = http.createServer((req, res) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(req.headers)); });
  const upstreamOrigin = await listen(upstream);
  const gateway = await createGateway({ gatewayKey, mode: 'production', apiPort: Number(new URL(upstreamOrigin).port), countryReader: () => 'NL' });
  const origin = await listen(gateway);
  t.after(async () => { await close(gateway); await close(upstream); });
  const response = await fetch(`${origin}/api/health`, { headers: { 'x-forwarded-for': '192.0.2.55', 'x-real-ip': '192.0.2.55', forwarded: 'for=192.0.2.55', referer: 'https://private.example/query', 'x-before-country': 'ZZ', 'x-before-gateway-key': 'spoofed' } });
  const headers = await response.json();
  assert.equal(headers['x-forwarded-for'], undefined);
  assert.equal(headers['x-real-ip'], undefined);
  assert.equal(headers.forwarded, undefined);
  assert.equal(headers.referer, undefined);
  assert.equal(headers['x-before-country'], 'NL');
  assert.equal(headers['x-before-gateway-key'], gatewayKey);
  assert.equal(headers['x-before-country-source'], 'ip');
});


test('research workspace approves owned local platforms explicitly and never silently replaces consent', async t => {
  const f = await fixture(t);
  const path = '/api/researcher/studies/reflection-first/platforms';
  assert.equal((await f.call(path)).status, 403);
  await f.login('researcher');
  assert.equal((await f.call('/api/moderator/sites', { role: 'researcher' })).status, 403);
  const original = JSON.stringify(f.app().locals.store.read());
  const available = (await f.call(path, { role: 'researcher' })).data;
  assert.equal(available.authority, 'local_demo_operator');
  assert.equal(available.platforms.length, 3);
  assert.equal(available.participation.platforms, 0);
  assert.equal(JSON.stringify(f.app().locals.store.read()), original);
  assert.ok(available.platforms.every(site => !site.onCurrentVersion && site.activeStudy === null));
  assert.doesNotMatch(JSON.stringify(available), /origins|returnUrl|owner|visitor|userAgent|ipAddress/);
  const approve = (revision, enabled, extra = {}) => f.call(`${path}/demo-forum`, { role: 'researcher', method: 'PUT', body: { studyRevision: revision, enabled, ...extra } });
  assert.equal((await approve('reflection-first@1', true, { originalText: 'rejected' })).status, 400);
  let response = await approve('reflection-first@1', true);
  assert.equal(response.status, 200);
  assert.equal(response.data.participation.platforms, 1);
  assert.equal(response.data.platforms.find(site => site.id === 'demo-forum').onCurrentVersion, true);
  assert.equal((await f.call(configPath)).data.studyRevision, 'reflection-first@1');
  await f.call('/api/researcher/studies/reflection-first/publish', { role: 'researcher', method: 'POST', body: {} });
  assert.equal((await f.call(configPath)).data.studyRevision, 'reflection-first@1');
  assert.equal((await f.call(path, { role: 'researcher' })).data.participation.platforms, 0);
  response = await approve('reflection-first@2', true);
  assert.equal(response.status, 409);
  assert.equal(response.data.code, 'replacement_confirmation_required');
  assert.equal((await f.call(configPath)).data.studyRevision, 'reflection-first@1');
  response = await approve('reflection-first@2', true, { confirmReplacement: true });
  assert.equal(response.status, 200);
  assert.equal((await f.call(configPath)).data.studyRevision, 'reflection-first@2');
  const other = (await f.call('/api/researcher/studies', { role: 'researcher', method: 'POST', body: newStudy('Another owner-approved comparison') })).data;
  const otherPath = `/api/researcher/studies/${other.id}/platforms/demo-forum`;
  assert.equal((await f.call(otherPath, { role: 'researcher', method: 'PUT', body: { studyRevision: 'reflection-first@2', enabled: true, confirmReplacement: true } })).status, 400);
  const otherPublished = (await f.call(`/api/researcher/studies/${other.id}/publish`, { role: 'researcher', method: 'POST', body: {} })).data;
  const otherRevision = otherPublished.publications[0].key;
  assert.equal((await f.call(otherPath, { role: 'researcher', method: 'PUT', body: { studyRevision: otherRevision, enabled: false } })).status, 409);
  assert.equal((await f.call(configPath)).data.studyRevision, 'reflection-first@2');
  assert.equal((await approve('reflection-first@2', false)).status, 200);
  assert.equal((await f.call(configPath)).data.studyRevision, 'site:demo-forum@1');
  await f.call('/api/researcher/studies/reflection-first/status', { role: 'researcher', method: 'PATCH', body: { status: 'paused' } });
  assert.equal((await approve('reflection-first@2', true)).status, 400);
  await f.app().locals.store.transact(state => { state.sites.wordpress.owner = 'another-owner'; state.sites['private-installation'] = { ...state.sites['demo-fieldnotes'], id: 'private-installation', name: 'PRIVATE-INSTALLATION-SENTINEL' }; });
  const scoped = (await f.call(path, { role: 'researcher' })).data;
  assert.equal(scoped.platforms.length, 2);
  assert.doesNotMatch(JSON.stringify(scoped), /PRIVATE-INSTALLATION-SENTINEL/);
  for (const id of ['wordpress', 'private-installation']) assert.equal((await f.call(`${path}/${id}`, { role: 'researcher', method: 'PUT', body: { studyRevision: 'reflection-first@2', enabled: false } })).status, 404);
});


test('plain legal and meaning layouts publish as immutable bilingual experiences while arbitrary layouts fail', async t => {
  const f = await fixture(t); await f.login('moderator'); await f.login('researcher');
  let revision = 1;
  for (const layout of ['plain', 'meaning']) {
    const draft = (await f.call('/api/moderator/sites/demo-forum/draft', { role: 'moderator' })).data;
    draft.layout = layout;
    draft.motion.enabled = false;
    if (layout === 'plain') draft.order = ['education', 'support'];
    assert.equal((await f.call('/api/moderator/sites/demo-forum/draft', { role: 'moderator', method: 'PUT', body: draft })).status, 200);
    const published = await f.call('/api/moderator/sites/demo-forum/publish', { role: 'moderator', method: 'POST', body: {} });
    assert.equal(published.status, 200);
    assert.equal(published.data.publications.at(-1).intervention.layout, layout);
    assert.equal(published.data.activePublication, `site:demo-forum@${++revision}`);
    const config = (await f.call(configPath + '?country=NL&lang=en')).data;
    assert.equal(config.arms[0].intervention.layout, layout);
    assert.ok(config.arms[0].intervention.en.title && config.arms[0].intervention.nl.title);
    assert.equal(config.legalPack.country, 'NL');
    assert.equal((await f.call(configPath + '?country=UNKNOWN')).data.legalPack, null);
    const invalid = { ...draft, layout: 'arbitrary-inline-markup' };
    assert.equal((await f.call('/api/moderator/sites/demo-forum/draft', { role: 'moderator', method: 'PUT', body: invalid })).status, 400);
    assert.equal((await f.call(configPath)).data.arms[0].intervention.layout, layout);
  }
  const experiment = newStudy('Distinct experience comparison');
  experiment.arms[0].intervention.layout = 'plain';
  experiment.arms[0].intervention.order = ['education', 'support'];
  experiment.arms[1].intervention.layout = 'meaning';
  const created = await f.call('/api/researcher/studies', { role: 'researcher', method: 'POST', body: experiment });
  assert.equal(created.status, 201);
  const published = (await f.call(`/api/researcher/studies/${created.data.id}/publish`, { role: 'researcher', method: 'POST', body: {} })).data;
  assert.deepEqual(published.publications[0].arms.map(arm => arm.intervention.layout), ['plain', 'meaning']);
  const laterDraft = { ...experiment, arms: structuredClone(experiment.arms) };
  laterDraft.arms[0].intervention.layout = 'reading';
  assert.equal((await f.call(`/api/researcher/studies/${created.data.id}`, { role: 'researcher', method: 'PUT', body: laterDraft })).status, 200);
  const stored = (await f.call(`/api/researcher/studies/${created.data.id}`, { role: 'researcher' })).data;
  assert.equal(stored.publications[0].arms[0].intervention.layout, 'plain');
  laterDraft.arms[1].intervention.layout = 'unknown-preset';
  assert.equal((await f.call(`/api/researcher/studies/${created.data.id}`, { role: 'researcher', method: 'PUT', body: laterDraft })).status, 400);
});
