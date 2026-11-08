// Development compatibility entry. Production uses the standalone /embed/before.js.
import { createBefore } from '../packages/browser/src/index.js';
const before = createBefore();
before.init({ endpoint: location.origin, siteId: 'demo-forum', demo: true }).catch(() => {});
