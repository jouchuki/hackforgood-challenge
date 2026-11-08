import { readFileSync, mkdirSync, writeFileSync, renameSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DEFAULT_INTERVENTION, newStudy, COUNTERS, ENGAGEMENT_COUNTERS, PATH_COUNTERS } from '../core/model.js';

export const today = () => new Date().toISOString().slice(0, 10);
export const zeroCounts = () => Object.fromEntries(COUNTERS.map(key => [key, 0]));

export function seedState() {
  const origins = ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3004', 'http://127.0.0.1:3004', 'http://localhost:9400', 'http://127.0.0.1:9400'];
  const sites = Object.fromEntries([
    ['demo-forum', 'MySmall20kUserForum', '/demo/forum'],
    ['demo-fieldnotes', 'Fieldnotes', '/demo/fieldnotes'],
    ['wordpress', 'WordPress community', 'http://localhost:9400/'],
  ].map(([id, name, returnUrl]) => {
    const intervention = structuredClone(DEFAULT_INTERVENTION);
    const publication = { key: `site:${id}@1`, revision: 1, intervention, publishedAt: new Date().toISOString() };
    return [id, { id, name, owner: 'moderator', origins: [...origins], returnUrl, country: 'NL', intervention: structuredClone(intervention), draft: structuredClone(intervention), publications: [publication], activePublication: publication.key, enrolment: null, enrolledRevisions: [] }];
  }));
  const study = { id: 'reflection-first', owner: 'researcher', ...newStudy(), status: 'running', publications: [] };
  study.publications.push({ key: 'reflection-first@1', revision: 1, ...newStudy(), publishedAt: new Date().toISOString() });
  const state = { schemaVersion: 1, sites, studies: { [study.id]: study }, buckets: {} };
  // Explicitly labelled neutral demonstration assumptions; no real-world winner.
  const day = today();
  for (const arm of study.arms) {
    const counts = zeroCounts();
    Object.assign(counts, { shown: 400, reflection_viewed: arm.id === 'B' ? 400 : 0, education_viewed: 320, support_viewed: 160, help_selected: 40, dismissed: 80, exited: 280, duration_lt10: 80, duration_10to30: 160, duration_30to60: 120, duration_gte60: 40, engagement_measured: 320, scrolled: 160, education_end_viewed: 240 });
    const bucket = { siteId: 'demo-forum', studyRevision: 'reflection-first@1', armId: arm.id, day, source: 'simulation', counts };
    state.buckets[bucketKey(bucket)] = bucket;
  }
  return state;
}

export const bucketKey = ({ siteId, studyRevision, armId, day, source }) => JSON.stringify([siteId, studyRevision, armId, day, source]);

function validState(value) {
  return value && value.schemaVersion === 1 && value.sites && !Array.isArray(value.sites) && value.studies && !Array.isArray(value.studies) && value.buckets && !Array.isArray(value.buckets) &&
    Object.values(value.buckets).every(bucket => bucket && bucket.counts && COUNTERS.every(key => Number.isSafeInteger(bucket.counts[key]) && bucket.counts[key] >= 0) && Object.keys(bucket.counts).every(key => COUNTERS.includes(key)));
}

// Only newly introduced optional counters are migrated. A zero measurement
// denominator means historical scrolling/end visibility is unavailable, not 0%.
function migrateEngagementCounters(value) {
  let changed = false;
  if (value?.schemaVersion === 1 && value.buckets && !Array.isArray(value.buckets)) {
    for (const bucket of Object.values(value.buckets)) {
      if (!bucket?.counts || typeof bucket.counts !== 'object' || Array.isArray(bucket.counts)) continue;
      for (const field of [...ENGAGEMENT_COUNTERS, ...PATH_COUNTERS]) if (!Object.hasOwn(bucket.counts, field)) { bucket.counts[field] = 0; changed = true; }
    }
  }
  return changed;
}

export function createStore(storePath = resolve('.before/state.json')) {
  const path = resolve(storePath);
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  let state;
  if (existsSync(path)) {
    state = JSON.parse(readFileSync(path, 'utf8'));
    const migrated = migrateEngagementCounters(state);
    if (!validState(state)) throw new Error('The local state schema is invalid. Restore a valid demo store or explicitly reset it.');
    if (migrated) persist(state);
  } else {
    state = seedState();
    persist(state);
  }
  let queue = Promise.resolve();
  function persist(next) {
    const temporary = `${path}.tmp`;
    writeFileSync(temporary, JSON.stringify(next, null, 2), { mode: 0o600 });
    renameSync(temporary, path);
  }
  return {
    read: () => structuredClone(state),
    transact(mutator) {
      const operation = queue.then(() => {
        const next = structuredClone(state);
        const result = mutator(next);
        persist(next);
        state = next;
        return structuredClone(result);
      });
      queue = operation.catch(() => {});
      return operation;
    },
    reset: () => {
      const operation = queue.then(() => { const next = seedState(); persist(next); state = next; return { ok: true }; });
      queue = operation.catch(() => {});
      return operation;
    },
  };
}
