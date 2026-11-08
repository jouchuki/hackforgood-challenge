import { COUNTERS } from '../core/model.js';
import { zeroCounts, bucketKey } from './store.js';
import { fail } from './validation.js';

const durationFields = ['duration_lt10', 'duration_10to30', 'duration_30to60', 'duration_gte60'];
const durationLabels = ['Under 10s', '10–30s', '30–60s', '60s or more'];
const ratio = (numerator, denominator) => !Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0 ? null : Math.round(numerator / denominator * 10000) / 100;

function ratesFromCounts(counts) {
  const durationsAvailable = durationFields.every(field => typeof counts[field] === 'number');
  const durationTotal = durationsAvailable ? durationFields.reduce((sum, field) => sum + counts[field], 0) : null;
  return {
    help_rate: ratio(counts.help_selected, counts.shown),
    completion_rate: ratio(counts.support_viewed, counts.shown),
    scroll_rate: ratio(counts.scrolled, counts.engagement_measured),
    message_end_rate: ratio(counts.education_end_viewed, counts.engagement_measured),
    retention_30s_rate: ratio(durationsAvailable ? counts.duration_30to60 + counts.duration_gte60 : null, durationTotal),
  };
}

export function addCounts(state, context, deltas) {
  const key = bucketKey(context);
  const bucket = state.buckets[key] || { ...context, counts: zeroCounts() };
  bucket.counts = { ...zeroCounts(), ...bucket.counts };
  for (const [field, delta] of Object.entries(deltas)) {
    if (!COUNTERS.includes(field) || !Number.isSafeInteger(bucket.counts[field] + delta)) fail('Counter limit exceeded.');
    bucket.counts[field] += delta;
  }
  state.buckets[key] = bucket;
}

export function safeSummary(raw) {
  const counts = Object.fromEntries(COUNTERS.map(field => [field, (raw[field] ?? 0) < 10 ? null : raw[field]]));
  // Withhold a second duration cell if one hidden cell could be derived from a total.
  const hidden = durationFields.filter(field => counts[field] === null);
  if (hidden.length === 1) {
    const another = durationFields.find(field => counts[field] !== null);
    if (another) counts[another] = null;
  }
  return { counts, rates: ratesFromCounts(counts), duration: durationFields.map((field, i) => ({ label: durationLabels[i], count: counts[field] })) };
}

function armName(state, studyRevision, armId) {
  for (const study of Object.values(state.studies)) {
    const publication = study.publications.find(p => p.key === studyRevision);
    const arm = publication?.arms.find(a => a.id === armId);
    if (arm) return arm.name;
  }
  for (const site of Object.values(state.sites)) {
    const publication = site.publications.find(p => p.key === studyRevision);
    if (publication) return publication.intervention.name;
  }
  return armId;
}

export function makeReport(state, { siteId, studyId, source = 'all', publication, from, to } = {}) {
  if (!['simulation', 'demo_interaction', 'all'].includes(source)) fail('Unknown data source.');
  for (const date of [from, to]) if (date !== undefined && (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`)))) fail('Use coarse ISO reporting dates.');
  const groups = new Map();
  const rawTotal = zeroCounts();
  const days = new Map();
  const dayGroups = new Map();
  const permitted = studyId ? new Set(state.studies[studyId]?.publications.map(p => p.key) || []) : null;
  for (const bucket of Object.values(state.buckets)) {
    if (COUNTERS.every(field => (bucket.counts[field] ?? 0) === 0)) continue;
    if (siteId && bucket.siteId !== siteId || permitted && !permitted.has(bucket.studyRevision) || publication && bucket.studyRevision !== publication || source !== 'all' && bucket.source !== source || from && bucket.day < from || to && bucket.day > to) continue;
    const key = JSON.stringify([bucket.studyRevision, bucket.armId]);
    const group = groups.get(key) || { studyRevision: bucket.studyRevision, armId: bucket.armId, name: armName(state, bucket.studyRevision, bucket.armId), raw: zeroCounts() };
    for (const field of COUNTERS) { group.raw[field] += bucket.counts[field] ?? 0; rawTotal[field] += bucket.counts[field] ?? 0; }
    groups.set(key, group);
    days.set(bucket.day, (days.get(bucket.day) || 0) + bucket.counts.shown);
    const dayKey = JSON.stringify([bucket.day, bucket.studyRevision, bucket.armId]);
    dayGroups.set(dayKey, (dayGroups.get(dayKey) || 0) + bucket.counts.shown);
  }
  const rows = [...groups.values()].map(({ raw, ...group }) => ({ ...group, ...safeSummary(raw) }));
  const totals = safeSummary(rawTotal);
  // Totals must not expose a hidden cell through cross-row subtraction.
  for (const field of COUNTERS) if (rows.some(row => row.counts[field] === null)) totals.counts[field] = null;
  totals.rates = ratesFromCounts(totals.counts);
  totals.duration = durationFields.map((field, i) => ({ label: durationLabels[i], count: totals.counts[field] }));
  return { rows, totals, source, threshold: 10, days: [...days].sort(([a], [b]) => a.localeCompare(b)).map(([day, shown]) => ({ day, shown: shown < 10 || [...dayGroups].some(([key, value]) => JSON.parse(key)[0] === day && value < 10) ? null : shown })) };
}

export function csvReport(report) {
  const quote = value => `"${String(value ?? '').replaceAll('"', '""')}"`;
  return [['source', 'study_revision', 'arm', ...COUNTERS, 'help_rate_percent', 'completion_rate_percent', 'scroll_rate_percent', 'message_end_rate_percent', 'retention_30s_rate_percent'], ...report.rows.map(row => [report.source, row.studyRevision, row.armId, ...COUNTERS.map(field => row.counts[field]), row.rates.help_rate, row.rates.completion_rate, row.rates.scroll_rate, row.rates.message_end_rate, row.rates.retention_30s_rate])].map(row => row.map(quote).join(',')).join('\n');
}

function rng(seed) {
  let value = 2166136261;
  for (const character of String(seed)) value = Math.imul(value ^ character.charCodeAt(0), 16777619);
  return () => { value += 0x6d2b79f5; let x = value; x = Math.imul(x ^ x >>> 15, x | 1); x ^= x + Math.imul(x ^ x >>> 7, x | 61); return ((x ^ x >>> 14) >>> 0) / 4294967296; };
}

export function simulate(state, { siteId, studyRevision, arms, volume, seed, helpRates = {}, day }) {
  const random = rng(seed);
  for (let i = 0; i < volume; i++) {
    let draw = random() * 100;
    const arm = arms.find(item => (draw -= item.weight) < 0) || arms.at(-1);
    const counts = { shown: 1, path_measured: 1 };
    for(let index=1;index<arm.intervention.order.length;index++)counts[`path_${arm.intervention.order[index-1]}_${arm.intervention.order[index]}`]=1;
    for (const stage of arm.intervention.order) counts[`${stage === 'support' ? 'support' : stage}_viewed`] = 1;
    if (arm.intervention.order.includes('education')) {
      counts.engagement_measured = 1;
      if (random() < 0.5) counts.scrolled = 1;
      if (random() < 0.75) counts.education_end_viewed = 1;
    }
    const helped = random() < (helpRates[arm.id] ?? 0.1);
    if (helped) counts.help_selected = 1;
    else if (random() < 0.35) counts.dismissed = 1;
    else counts.exited = 1;
    counts[durationFields[Math.min(3, Math.floor(random() * 4))]] = 1;
    addCounts(state, { siteId, studyRevision, armId: arm.id, day, source: 'simulation' }, counts);
  }
}
