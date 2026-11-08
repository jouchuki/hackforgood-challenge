import express from 'express';
import { createHmac, timingSafeEqual, randomUUID } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStore, today } from './store.js';
import { ApiError, fail, exact, text, countryCode, intervention, studyDraft, countDelta, siteSettings, object } from './validation.js';
import { addCounts, makeReport, csvReport, simulate } from './reports.js';
import { newStudy, escapeHtml as esc } from '../core/model.js';
import { COUNTRY_PACKS, PREVIEW_LANGUAGES } from '../content/countries.js';
import { CATALOGUE } from '../content/catalogue.js';
import { createDeploymentChecks } from './deployment.js';
import { helpHtml } from './help.js';
import { createDiscordConnection } from './discord-connection.js';
import { createDiscordIntegrationSettings } from './integration-settings.js';
import { mountResearchLab } from './research-lab.js';
import { createDiscordOAuth } from './discord-oauth.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const helpServices = JSON.parse(readFileSync(new URL('../data/help-services.json', import.meta.url), 'utf8'));
const legalPacks = JSON.parse(readFileSync(new URL('../data/legal-confidentiality.json', import.meta.url), 'utf8'));
const asyncRoute = fn => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);
const yesterday = () => new Date(Date.now() - 86400000).toISOString().slice(0, 10);
const notFound = () => fail('The requested record was not found.', 404, 'not_found');
const getSite = (state, id) => Object.hasOwn(state.sites, id) ? state.sites[id] : notFound();
const getStudy = (state, id) => Object.hasOwn(state.studies, id) ? state.studies[id] : notFound();
const studySnapshot = study => Object.fromEntries(['name', 'hypothesis', 'primary', 'countries', 'languages', 'arms'].map(key => [key, structuredClone(study[key])]));
const publicSite = site => ({ id: site.id, name: site.name, returnUrl: site.returnUrl, country: site.country });

function knownRevision(state, site, key) {
  const own = site.publications.find(p => p.key === key);
  if (own) return { arms: [{ id: 'default', name: own.intervention.name, weight: 100, intervention: own.intervention }], publication: own };
  for (const study of Object.values(state.studies)) {
    const publication = study.publications.find(p => p.key === key);
    if (publication) return { arms: publication.arms, publication, study };
  }
  return null;
}

function runtime(state, site, req) {
  const explicit = typeof req.query.country === 'string' && countryCode(req.query.country) ? req.query.country : null;
  const hint = countryCode(req.get('x-before-country')) ? req.get('x-before-country') : 'UNKNOWN';
  const hintSource = req.get('x-before-country-source');
  const country = explicit || (hintSource === 'tor' ? 'UNKNOWN' : hint !== 'UNKNOWN' ? hint : site.country || 'UNKNOWN');
  const countrySource = explicit ? 'selection' : hintSource === 'tor' ? 'tor' : hint !== 'UNKNOWN' ? 'ip' : site.country ? 'platform' : 'unknown';
  const language = req.query.lang === 'nl' ? 'nl' : 'en';
  let resolved = knownRevision(state, site, site.activePublication);
  const enrolled = site.enrolment?.enabled ? knownRevision(state, site, site.enrolment.studyRevision) : null;
  if (enrolled?.study && enrolled.study.status === 'running' && enrolled.publication.countries.includes(country) && enrolled.publication.languages.includes(language)) resolved = enrolled;
  const services = country === 'NL' ? helpServices.filter(service => service.country === 'NL') : helpServices.filter(service => service.id === 'redirection');
  const legalPack = country === 'NL' ? { ...legalPacks.find(pack => pack.country === 'NL'), version: 'nl-demo-1', status: 'reviewed' } : null;
  return { siteId: site.id, site: publicSite(site), studyRevision: resolved.publication.key, reportingDay: today(), country, countrySource, arms: resolved.arms, services, legalPack };
}

function cookies(header = '') {
  return Object.fromEntries(header.split(';').map(part => part.trim().split('=')).filter(parts => parts.length === 2));
}
function equal(a, b) {
  return typeof a === 'string' && typeof b === 'string' && a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export function createApp({ storePath = resolve(root, '.before/state.json'), gatewayKey = process.env.BEFORE_GATEWAY_KEY, frontendOrigin = 'http://localhost:3000', discordConnection, integrationSettings, posthogBridge, discordOAuth } = {}) {
  if (!gatewayKey || gatewayKey.length < 16) throw new Error('A private BEFORE_GATEWAY_KEY of at least 16 characters is required.');
  const app = express();
  const store = createStore(storePath);
  const deployment = createDeploymentChecks({ frontendOrigin, packagePath: resolve(root, 'dist/embed/before.js') });
  const deploymentContext = (state, site, req) => { const config = runtime(state, site, req); return { country: config.country, publication: config.studyRevision, configured: config.arms.length > 0 && config.arms.every(arm => Boolean(arm.intervention?.en?.title && arm.intervention?.nl?.title)) }; };
  const researcherStudy = (state, study) => {
    const revision = study.publications.at(-1)?.key;
    const platforms = revision ? Object.values(state.sites).filter(site => site.enrolment?.enabled && site.enrolment.studyRevision === revision).length : 0;
    return { ...study, participation: { platforms, allocation: 'per_exposure', scope: 'opted_in_platforms' } };
  };
  // These seeded, loopback-only workspaces share an owner/operator for the demo.
  // A production researcher is not a platform owner: its approval flow must remain
  // separate. Never list arbitrary installations or auto-enrol on publication.
  const operatorSiteIds = new Set(['demo-forum', 'demo-fieldnotes', 'wordpress']);
  const ownedOperatorSite = (state, id) => {
    const site = getSite(state, id);
    if (!operatorSiteIds.has(id) || site.owner !== 'moderator') notFound();
    return site;
  };
  const studyPlatforms = (state, study) => {
    const currentPublication = study.publications.at(-1)?.key || null;
    const platforms = Object.values(state.sites).filter(site => operatorSiteIds.has(site.id) && site.owner === 'moderator').map(site => {
      const enrolled = site.enrolment?.enabled ? knownRevision(state, site, site.enrolment.studyRevision) : null;
      return {
        id: site.id, name: site.name, country: site.country,
        enrolment: site.enrolment ? { studyRevision: site.enrolment.studyRevision, enabled: site.enrolment.enabled } : null,
        onCurrentVersion: Boolean(currentPublication && site.enrolment?.enabled && site.enrolment.studyRevision === currentPublication),
        activeStudy: enrolled?.study ? { id: enrolled.study.id, name: enrolled.publication.name, studyRevision: enrolled.publication.key } : null,
      };
    });
    return { authority: 'local_demo_operator', studyId: study.id, currentPublication, participation: researcherStudy(state, study).participation, platforms };
  };
  app.disable('x-powered-by');
  app.locals.store = store;
  const discord = discordConnection || createDiscordConnection();
  app.locals.discord = discord;
  const discordSettings = integrationSettings || createDiscordIntegrationSettings({ siteExists: id => Boolean(store.read().sites[id]) });
  app.use((req, res, next) => {
    res.set('Referrer-Policy', 'no-referrer');
    res.set('X-Content-Type-Options', 'nosniff');
    if (!equal(req.get('x-before-gateway-key'), gatewayKey)) return res.status(403).json({ error: 'Use the owned application gateway.', code: 'gateway_required' });
    next();
  });
  app.use(express.json({ limit: '1mb', strict: true }));
  const tokenFor = role => createHmac('sha256', gatewayKey).update(`local-demo-role:${role}`).digest('hex');
  const roleRequired = role => (req, res, next) => {
    if (!equal(cookies(req.get('cookie'))[`before_${role}`], tokenFor(role))) return res.status(403).json({ error: `Open the ${role} workspace to establish its local demo session.`, code: 'role_required' });
    next();
  };
  const csrf = (req, res, next) => {
    const origin = req.get('origin');
    if (origin && origin !== frontendOrigin && !['http://localhost:3000', 'http://127.0.0.1:3000'].includes(origin)) return res.status(403).json({ error: 'Administration is restricted to the local workspace origin.', code: 'origin_denied' });
    next();
  };
  app.use('/api', (_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  app.get('/api/health', (req, res) => res.json({ ok: true, storage: 'ready', geo: req.get('x-before-geo-status') || 'unknown', mode: 'local-demo', tracking: false }));
  app.post('/api/session', csrf, (req, res) => {
    exact(req.body, ['role'], ['role']);
    const { role } = req.body;
    if (!['moderator', 'researcher', 'presenter'].includes(role)) fail('Unknown demo role.');
    const path = `/api/${role}`;
    res.cookie(`before_${role}`, tokenFor(role), { httpOnly: true, sameSite: 'lax', path, maxAge: 86400000 });
    res.json({ role, demo: true });
  });

  const publicCors = (req, res, next) => {
    const site = getSite(store.read(), req.params.siteId);
    const origin = req.get('origin');
    if (origin && !site.origins.includes(origin)) return res.status(403).json({ error: 'This website origin is not enabled for the installation.', code: 'origin_denied' });
    if (origin) { res.set('Access-Control-Allow-Origin', origin); res.vary('Origin'); }
    res.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  };
  app.options('/api/public/sites/:siteId/*', publicCors);
  app.get('/api/public/sites/:siteId/config', publicCors, (req, res) => {
    const state = store.read(); res.json(runtime(state, getSite(state, req.params.siteId), req));
  });
  app.post('/api/public/sites/:siteId/deployment-check', publicCors, (req, res) => {
    exact(req.body, ['token', 'step'], ['token', 'step']);
    const { token, step } = req.body;
    if (!/^[a-f0-9]{32}$/.test(token || '') || !['sdk', 'submitted', 'rendered'].includes(step)) fail('Use an active installation check.');
    if (!deployment.receipt(req.params.siteId, token, step, req.get('origin'))) fail('This installation check expired or does not match the installation.', 403, 'check_unavailable');
    res.json({ ok: true });
  });
  app.post('/api/public/sites/:siteId/metrics', publicCors, asyncRoute(async (req, res) => {
    exact(req.body, ['schemaVersion', 'studyRevision', 'armId', 'reportingDay', 'source', 'counts'], ['studyRevision', 'armId', 'reportingDay', 'source', 'counts']);
    if (req.body.schemaVersion !== undefined && req.body.schemaVersion !== 1) fail('Unknown measurement schema version.');
    const { studyRevision, armId, reportingDay, source, counts } = req.body;
    if (source !== 'demo_interaction' || ![today(), yesterday()].includes(reportingDay) || typeof studyRevision !== 'string' || studyRevision.length > 150 || !['default', 'A', 'B', 'C', 'D'].includes(armId)) fail('Use a current reporting day and known published context.');
    countDelta(counts);
    await store.transact(state => {
      const site = getSite(state, req.params.siteId);
      const known = knownRevision(state, site, studyRevision);
      if (!known || !known.arms.some(arm => arm.id === armId)) fail('Unknown published variant.');
      // Only accepted installation publications or an opted-in study may collect.
      if (known.study && site.enrolment?.studyRevision !== studyRevision && !site.enrolledRevisions?.includes(studyRevision)) fail('The platform has not enabled this study revision.', 403, 'study_not_enabled');
      addCounts(state, { siteId: site.id, studyRevision, armId, day: reportingDay, source }, counts);
      return null;
    });
    res.json({ ok: true });
  }));

  app.use('/api/moderator', csrf, roleRequired('moderator'));
  app.use('/api/researcher', csrf, roleRequired('researcher'));
  app.use('/api/presenter', csrf, roleRequired('presenter'));
  app.get('/api/moderator/integrations/discord/config', (_req, res) => res.json(discordSettings.read()));
  app.post('/api/moderator/integrations/discord/config', asyncRoute(async (req, res) => res.json(await discordSettings.save(req.body))));
  mountResearchLab(app, { store, posthog: posthogBridge });
  const oauth = discordOAuth || createDiscordOAuth({frontendOrigin});
  app.locals.discordOAuth = oauth;
  app.use('/api/moderator/integrations/discord/oauth', oauth.router);
  const discordStatus = status => ({ ...status, siteName: store.read().sites[status.siteId]?.name || null });
  app.get('/api/moderator/discord', (_req, res) => res.json(discordStatus(discord.read())));
  app.post('/api/moderator/discord/connect', asyncRoute(async (req, res) => {
    exact(req.body || {}, []);
    res.json(discordStatus(await discord.connect({ enableProtection: true })));
  }));
  app.get('/api/moderator/sites', (_req, res) => res.json(Object.values(store.read().sites)));
  app.get('/api/moderator/sites/:siteId', (req, res) => res.json(getSite(store.read(), req.params.siteId)));
  app.put('/api/moderator/sites/:siteId', asyncRoute(async (req, res) => {
    const updates = siteSettings(req.body);
    const site = await store.transact(state => { const site = getSite(state, req.params.siteId); Object.assign(site, updates); return site; });
    res.json(site);
  }));
  app.get('/api/moderator/sites/:siteId/deployment', (req, res) => {
    const state = store.read(); const site = getSite(state, req.params.siteId);
    res.json(deployment.read(site, deploymentContext(state, site, req)));
  });
  app.post('/api/moderator/sites/:siteId/deployment', (req, res) => {
    exact(req.body || {}, []);
    const state = store.read(); const site = getSite(state, req.params.siteId);
    res.json(deployment.start(site, deploymentContext(state, site, req)));
  });
  app.get('/api/moderator/sites/:siteId/draft', (req, res) => res.json(getSite(store.read(), req.params.siteId).draft));
  app.put('/api/moderator/sites/:siteId/draft', asyncRoute(async (req, res) => {
    const draft = intervention(req.body);
    res.json(await store.transact(state => { const site = getSite(state, req.params.siteId); site.draft = draft; return draft; }));
  }));
  app.post('/api/moderator/sites/:siteId/publish', asyncRoute(async (req, res) => {
    exact(req.body || {}, []);
    res.json(await store.transact(state => {
      const site = getSite(state, req.params.siteId);
      const draft = intervention(site.draft);
      const revision = site.publications.length + 1;
      const publication = { key: `site:${site.id}@${revision}`, revision, intervention: draft, publishedAt: new Date().toISOString() };
      site.publications.push(publication); site.activePublication = publication.key; site.intervention = structuredClone(draft);
      return site;
    }));
  }));
  app.post('/api/moderator/sites/:siteId/revert', asyncRoute(async (req, res) => {
    exact(req.body || {}, ['publicationKey']);
    res.json(await store.transact(state => {
      const site = getSite(state, req.params.siteId);
      const activeIndex = site.publications.findIndex(p => p.key === site.activePublication);
      const selected = req.body?.publicationKey ? site.publications.find(p => p.key === req.body.publicationKey) : site.publications[Math.max(0, activeIndex - 1)];
      if (!selected) fail('Select a known publication.');
      site.activePublication = selected.key; site.intervention = structuredClone(selected.intervention); site.draft = structuredClone(selected.intervention); return site;
    }));
  }));
  app.get('/api/moderator/studies', (_req, res) => res.json(Object.values(store.read().studies).filter(study => study.publications.length > 0).map(study => ({ ...study, ...structuredClone(study.publications.at(-1)) }))));
  app.get('/api/moderator/sites/:siteId/enrolment', (req, res) => res.json(getSite(store.read(), req.params.siteId).enrolment));
  app.put('/api/moderator/sites/:siteId/enrolment', asyncRoute(async (req, res) => {
    exact(req.body, ['studyRevision', 'enabled'], ['studyRevision', 'enabled']);
    if (typeof req.body.enabled !== 'boolean' || typeof req.body.studyRevision !== 'string') fail('Select a published study revision and participation state.');
    res.json(await store.transact(state => {
      const site = getSite(state, req.params.siteId);
      const known = knownRevision(state, site, req.body.studyRevision);
      if (!known?.study) fail('The study revision has not been published.');
      site.enrolment = { studyRevision: req.body.studyRevision, enabled: req.body.enabled };
      if (req.body.enabled) site.enrolledRevisions = [...new Set([...(site.enrolledRevisions || []), req.body.studyRevision])];
      return site.enrolment;
    }));
  }));
  app.get('/api/moderator/content', (_req, res) => res.json({ countries: COUNTRY_PACKS, previewLanguages: PREVIEW_LANGUAGES, services: helpServices }));
  app.get('/api/moderator/integrations', (_req, res) => res.json(CATALOGUE));

  const reportFor = (req, options) => makeReport(store.read(), { ...options, source: req.query.source || 'all', publication: req.query.publication, from: req.query.from, to: req.query.to });

  app.get('/api/researcher/studies', (_req, res) => { const state = store.read(); res.json(Object.values(state.studies).map(study => researcherStudy(state, study))); });
  app.post('/api/researcher/studies', asyncRoute(async (req, res) => {
    let draft;
    if (Object.keys(req.body || {}).length === 1 && text(req.body.name, 100)) draft = studyDraft(newStudy(req.body.name));
    else draft = studyDraft(req.body);
    res.status(201).json(await store.transact(state => {
      if (Object.keys(state.studies).length >= 50) fail('The local demonstration supports up to 50 studies.');
      const study = { id: `study-${randomUUID()}`, owner: 'researcher', ...draft, status: 'draft', publications: [] };
      state.studies[study.id] = study; return researcherStudy(state, study);
    }));
  }));
  app.get('/api/researcher/studies/:id', (req, res) => { const state = store.read(); res.json(researcherStudy(state, getStudy(state, req.params.id))); });
  app.put('/api/researcher/studies/:id', asyncRoute(async (req, res) => {
    const draft = studyDraft(req.body);
    res.json(await store.transact(state => { const study = getStudy(state, req.params.id); Object.assign(study, draft); return researcherStudy(state, study); }));
  }));
  app.post('/api/researcher/studies/:id/publish', asyncRoute(async (req, res) => {
    exact(req.body || {}, []);
    res.json(await store.transact(state => {
      const study = getStudy(state, req.params.id);
      const snapshot = studyDraft(studySnapshot(study));
      const revision = study.publications.length + 1;
      study.publications.push({ key: `${study.id}@${revision}`, revision, ...snapshot, publishedAt: new Date().toISOString() });
      study.status = 'running'; return researcherStudy(state, study);
    }));
  }));
  app.patch('/api/researcher/studies/:id/status', asyncRoute(async (req, res) => {
    exact(req.body, ['status'], ['status']);
    if (!['running', 'paused', 'ended'].includes(req.body.status)) fail('Use a supported study status.');
    res.json(await store.transact(state => { const study = getStudy(state, req.params.id); if (!study.publications.length && req.body.status === 'running') fail('Publish the study before running it.'); study.status = req.body.status; return researcherStudy(state, study); }));
  }));
  app.get('/api/researcher/studies/:id/platforms', (req, res) => {
    const state = store.read(); res.json(studyPlatforms(state, getStudy(state, req.params.id)));
  });
  app.put('/api/researcher/studies/:id/platforms/:siteId', asyncRoute(async (req, res) => {
    exact(req.body, ['studyRevision', 'enabled', 'confirmReplacement'], ['studyRevision', 'enabled']);
    const { studyRevision, enabled, confirmReplacement } = req.body;
    if (typeof studyRevision !== 'string' || typeof enabled !== 'boolean' || confirmReplacement !== undefined && typeof confirmReplacement !== 'boolean') fail('Select a published version and participation state.');
    res.json(await store.transact(state => {
      const study = getStudy(state, req.params.id);
      const site = ownedOperatorSite(state, req.params.siteId);
      if (!study.publications.some(publication => publication.key === studyRevision)) fail('Select a published version of this study.');
      if (enabled && study.status !== 'running') fail('Open the study for participation before enabling it on a platform.');
      const replacing = site.enrolment?.enabled && site.enrolment.studyRevision !== studyRevision;
      if (enabled && replacing && confirmReplacement !== true) fail('Confirm replacement of the platform’s enabled study version.', 409, 'replacement_confirmation_required');
      if (!enabled && replacing) fail('This platform is enabled for another study version.', 409, 'enrolment_mismatch');
      site.enrolment = { studyRevision, enabled };
      if (enabled) site.enrolledRevisions = [...new Set([...(site.enrolledRevisions || []), studyRevision])];
      return studyPlatforms(state, study);
    }));
  }));
  app.get('/api/researcher/studies/:id/metrics', (req, res) => { getStudy(store.read(), req.params.id); res.json(reportFor(req, { studyId: req.params.id })); });
  app.get('/api/researcher/studies/:id/export', (req, res) => { getStudy(store.read(), req.params.id); res.type('text/csv').attachment('before-study-aggregates.csv').send(csvReport(reportFor(req, { studyId: req.params.id }))); });

  const runSimulation = async req => {
    exact(req.body, ['volume', 'seed', 'helpRates', 'studyRevision', 'days'], ['volume', 'seed']);
    const { volume, seed, helpRates = {}, days = 1 } = req.body;
    if (!Number.isInteger(volume) || volume < 10 || volume > 10000 || !(text(String(seed), 128)) || !Number.isInteger(days) || days < 1 || days > 30 || !object(helpRates) || Object.entries(helpRates).some(([arm, probability]) => !['default', 'A', 'B', 'C', 'D'].includes(arm) || typeof probability !== 'number' || !Number.isFinite(probability) || probability < 0 || probability > 1)) fail('Provide 10–10,000 synthetic exposures, a seed, and valid optional probabilities.');
    await store.transact(state => {
      const site = getSite(state, req.params.siteId);
      const requested = req.body.studyRevision || site.enrolment?.studyRevision || 'reflection-first@1';
      const resolved = knownRevision(state, site, requested);
      if (!resolved) fail('Select a known publication for the synthetic scenario.');
      for (let i = 0; i < days; i++) {
        const day = new Date(Date.now() - (days - i - 1) * 86400000).toISOString().slice(0, 10);
        const count = Math.floor(volume / days) + (i < volume % days ? 1 : 0);
        simulate(state, { siteId: site.id, studyRevision: requested, arms: resolved.arms, volume: count, seed: `${seed}:${i}`, helpRates, day });
      }
      return null;
    });
    return { ok: true, source: 'simulation', generated: volume, seed: String(seed), assumptions: { helpRates: { default: 0.1, A: 0.1, B: 0.1, C: 0.1, D: 0.1, ...helpRates } } };
  };
  app.post('/api/presenter/reset', asyncRoute(async (_req, res) => res.json(await store.reset())));
  app.post('/api/presenter/sites/:siteId/simulate', asyncRoute(async (req, res) => res.json(await runSimulation(req))));
  app.get('/api/presenter/sites/:siteId/metrics', (req, res) => { getSite(store.read(), req.params.siteId); res.json(reportFor(req, { siteId: req.params.siteId })); });
  app.get('/help', (req, res) => res.type('html').send(helpHtml(req, helpServices, legalPacks)));
  app.use('/api', (_req, res) => res.status(404).json({ error: 'API route not found.', code: 'not_found' }));
  const dist = resolve(root, 'dist');
  app.use(express.static(dist, { index: false, dotfiles: 'deny' }));
  app.get(['/intervention/:siteId', '/intervention/'], (_req, res) => {
    const file = resolve(dist, 'intervention/index.html');
    if (!existsSync(file)) return res.status(503).type('text').send('Build the intervention before starting production mode.');
    res.sendFile(file);
  });
  app.get('/demo/:page', (_req, res) => {
    const file = resolve(dist, 'demo/index.html');
    if (!existsSync(file)) return res.status(503).type('text').send('Build the demonstration before starting production mode.');
    res.sendFile(file);
  });
  app.get('*', (_req, res) => {
    const index = resolve(dist, 'index.html');
    if (!existsSync(index)) return res.status(503).type('text').send('Build the local application or start development mode.');
    res.sendFile(index);
  });
  app.use((error, _req, res, _next) => {
    const status = error instanceof ApiError ? error.status : error.type === 'entity.too.large' ? 413 : error instanceof SyntaxError ? 400 : 500;
    res.status(status).json({ error: status === 500 ? 'The local operation could not be completed.' : error instanceof ApiError ? error.message : 'The request body is invalid or too large.', code: error instanceof ApiError ? error.code : 'request_failed' });
  });
  return app;
}

