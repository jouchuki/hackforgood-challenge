import { resolve } from 'node:path';
import { createStore } from './store.js';
const operation = process.argv[2] || 'seed';
if (!['seed', 'reset'].includes(operation)) { process.stderr.write('Use seed or reset.\n'); process.exit(1); }
const store = createStore(process.env.BEFORE_STORE_PATH || resolve('.before/state.json'));
if (operation === 'reset') await store.reset();
process.stdout.write(operation === 'reset' ? 'Local synthetic workspace reset.\n' : 'Local synthetic workspace ready; existing state preserved.\n');
