import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { COUNTERS, ENGAGEMENT_COUNTERS } from '../core/model.js';
import { createStore, seedState, zeroCounts } from '../server/store.js';
import { makeReport, safeSummary, csvReport } from '../server/reports.js';
import { countDelta } from '../server/validation.js';
const counts = overrides => ({ ...zeroCounts(), ...overrides });
const bucket = (armId, raw) => ({ siteId: 'demo', studyRevision: 'study@1', armId, day: '2026-11-08', source: 'demo_interaction', counts: raw });

test('legacy counter files migrate without erasing data or inventing historical engagement', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'before-engagement-')); t.after(() => rm(dir, { recursive: true, force: true }));
  const path = join(dir, 'state.json'); const legacy = seedState();
  for (const value of Object.values(legacy.buckets)) for (const field of ENGAGEMENT_COUNTERS) delete value.counts[field];
  const prior = structuredClone(legacy); await writeFile(path, JSON.stringify(legacy));
  const store = createStore(path); const restored = store.read();
  for (const [key, value] of Object.entries(prior.buckets)) {
    for (const [field, count] of Object.entries(value.counts)) assert.equal(restored.buckets[key].counts[field], count);
    for (const field of ENGAGEMENT_COUNTERS) assert.equal(restored.buckets[key].counts[field], 0);
  }
  const report = makeReport(restored);
  assert.equal(report.totals.counts.shown, 800);
  for (const row of report.rows) { assert.equal(row.rates.scroll_rate, null); assert.equal(row.rates.message_end_rate, null); assert.equal(row.rates.retention_30s_rate, 40); }
  const persisted = JSON.parse(await readFile(path, 'utf8'));
  assert.equal(Object.keys(persisted.buckets).length, Object.keys(prior.buckets).length);
  assert.equal(Object.values(persisted.buckets)[0].counts.engagement_measured, 0);
  // Corruption of a required old counter is still an error, never a reset/migration.
  delete Object.values(persisted.buckets)[0].counts.shown; await writeFile(path, JSON.stringify(persisted));
  assert.throws(() => createStore(path), /schema is invalid/);
});

test('engagement rates use measured education and finalized-duration denominators', () => {
  const summary = safeSummary(counts({ shown: 1000, education_viewed: 500, engagement_measured: 100, scrolled: 40, education_end_viewed: 80, duration_lt10: 20, duration_10to30: 30, duration_30to60: 40, duration_gte60: 10 }));
  assert.equal(summary.rates.scroll_rate, 40);
  assert.equal(summary.rates.message_end_rate, 80);
  assert.equal(summary.rates.retention_30s_rate, 50);
  assert.equal(summary.counts.engagement_measured, 100);
});

test('small engagement cells and duration complements cannot leak through rates, totals or exports', () => {
  const visible = counts({ shown: 100, engagement_measured: 100, scrolled: 40, education_end_viewed: 70, duration_lt10: 20, duration_10to30: 30, duration_30to60: 30, duration_gte60: 20 });
  const small = counts({ shown: 100, engagement_measured: 100, scrolled: 9, education_end_viewed: 9, duration_lt10: 30, duration_10to30: 30, duration_30to60: 31, duration_gte60: 9 });
  const report = makeReport({ sites: {}, studies: {}, buckets: { a: bucket('A', visible), b: bucket('B', small) } });
  for (const field of ['scrolled', 'education_end_viewed']) { assert.equal(report.rows[1].counts[field], null); assert.equal(report.totals.counts[field], null); }
  for (const field of ['scroll_rate', 'message_end_rate', 'retention_30s_rate']) { assert.equal(report.rows[1].rates[field], null); assert.equal(report.totals.rates[field], null); }
  assert.ok(report.rows[1].duration.filter(cell => cell.count === null).length >= 2);
  const csv = csvReport(report); assert.match(csv, /scroll_rate_percent/); assert.match(csv, /retention_30s_rate_percent/); assert.doesNotMatch(csv, /"9"/);
  assert.equal(safeSummary(counts({ shown: 100, engagement_measured: 9, scrolled: 20, education_end_viewed: 20 })).rates.scroll_rate, null);
});

test('collector accepts only coarse engagement counters and rejects raw scroll/activity details', () => {
  assert.deepEqual(countDelta({ engagement_measured: 1, scrolled: 1, education_end_viewed: 1 }), { engagement_measured: 1, scrolled: 1, education_end_viewed: 1 });
  for (const invalid of [{ scrollY: 150 }, { scrollPercent: 85 }, { timestamp: 12345 }, { scrolled: -1 }, { education_end_viewed: 0.1 }]) assert.throws(() => countDelta(invalid));
  assert.equal(new Set(COUNTERS).size, COUNTERS.length);
});
