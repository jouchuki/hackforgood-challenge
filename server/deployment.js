import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';

// Administrator-triggered installation diagnostics. Challenges live in memory only;
// ordinary visitors never create a challenge and no submitted content is accepted.
export function createDeploymentChecks({ frontendOrigin, packagePath, clock = Date.now }) {
  const challenges = new Map();
  const latest = new Map();
  const lifetime = 10 * 60 * 1000;
  const clean = () => {
    for (const [token, value] of challenges) if (value.expires < clock() - lifetime) challenges.delete(token);
  };
  function target(site) {
    const local = ['localhost', '127.0.0.1'].includes(new URL(frontendOrigin).hostname);
    const base = local && site.id === 'demo-fieldnotes' && site.returnUrl === '/demo/fieldnotes' ? 'http://localhost:3004' : frontendOrigin;
    try {
      const url = new URL(site.returnUrl, base);
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || !site.origins.includes(url.origin)) return null;
      url.search = ''; url.hash = '';
      return url;
    } catch { return null; }
  }
  function read(site, { country, publication, configured }) {
    clean();
    const url = target(site);
    const checks = [
      { id: 'service', status: 'passed', label: 'Before service', detail: 'The owned service is responding.' },
      { id: 'package', status: existsSync(packagePath) ? 'passed' : 'failed', label: 'Browser package', detail: existsSync(packagePath) ? 'The built browser script is available.' : 'Build the browser package before testing.' },
      { id: 'configuration', status: configured ? 'passed' : 'failed', label: 'Published message', detail: configured ? `${publication} · ${country}` : 'Publish a valid message before testing.' },
      { id: 'origin', status: url ? 'passed' : 'failed', label: 'Installation address', detail: url ? url.href : 'Set an HTTP(S) return URL with an enabled origin.' },
    ];
    const challenge = challenges.get(latest.get(site.id));
    const expired = challenge && challenge.expires < clock();
    const verified = challenge && !expired && Object.values(challenge.steps).every(Boolean);
    return {
      checks,
      verification: {
        status: expired ? 'expired' : verified ? 'verified' : challenge ? 'checking' : 'not_checked',
        steps: challenge && !expired ? { ...challenge.steps } : { sdk: false, submitted: false, rendered: false },
        checkedAt: verified ? challenge.checkedAt : null,
        expiresAt: challenge ? new Date(challenge.expires).toISOString() : null,
      },
      testUrl: challenge && !expired ? challenge.url : null,
    };
  }
  function start(site, context) {
    const result = read(site, context);
    if (result.checks.some(check => check.status === 'failed')) return result;
    const token = randomBytes(16).toString('hex');
    const url = target(site); url.searchParams.set('before_check', token);
    const previous = latest.get(site.id); if (previous) challenges.delete(previous);
    challenges.set(token, { siteId: site.id, origin: url.origin, expires: clock() + lifetime, steps: { sdk: false, submitted: false, rendered: false }, checkedAt: null, url: url.href });
    latest.set(site.id, token);
    return read(site, context);
  }
  function receipt(siteId, token, step, origin) {
    const challenge = challenges.get(token);
    if (!challenge || challenge.siteId !== siteId || challenge.expires < clock()) return false;
    // The SDK runs on the installation; the rendered receipt comes from Before.
    const expected = step === 'rendered' ? frontendOrigin : challenge.origin;
    if (origin !== expected) return false;
    if (step === 'submitted' && !challenge.steps.sdk || step === 'rendered' && !challenge.steps.submitted) return false;
    challenge.steps[step] = true;
    if (Object.values(challenge.steps).every(Boolean)) challenge.checkedAt = new Date(clock()).toISOString();
    return true;
  }
  return { read, start, receipt };
}
