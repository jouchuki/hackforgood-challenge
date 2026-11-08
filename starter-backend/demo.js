import express from 'express';
import { defaultConfig, initialExperiments } from '../app/shared.js';

// Local, synthetic design prototype only. No visitor events or identifiers.
export function createDemoRouter() {
  const router = express.Router();
  let config = structuredClone(defaultConfig);
  const experiments = structuredClone(initialExperiments);
  router.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  router.get('/config', (_req, res) => res.json(config));
  router.put('/config', (req, res) => {
    const draft = req.body;
    if (typeof draft.name !== 'string' || !draft.name.trim() || draft.name.length > 100 ||
        typeof draft.legal !== 'boolean' || !['NL', 'OTHER'].includes(draft.country) ||
        !['en', 'nl'].every(lang => ['title', 'body', 'button'].every(key =>
          typeof draft[lang]?.[key] === 'string' && draft[lang][key].trim().length > 0 && draft[lang][key].length <= 1500))) {
      return res.status(400).json({ error: 'Complete both language versions before publishing.' });
    }
    config = {
      revision: config.revision + 1, name: draft.name.trim(), legal: draft.legal, country: draft.country,
      en: Object.fromEntries(['title', 'body', 'button'].map(key => [key, draft.en[key].trim()])),
      nl: Object.fromEntries(['title', 'body', 'button'].map(key => [key, draft.nl[key].trim()])),
    };
    res.json(config);
  });
  router.get('/experiments', (_req, res) => res.json(experiments));
  router.post('/experiments', (req, res) => {
    const { name, hypothesis, allocation, primary } = req.body;
    if (typeof name !== 'string' || !name.trim() || name.length > 100 ||
        typeof hypothesis !== 'string' || !hypothesis.trim() || hypothesis.length > 1500 ||
        !Number.isInteger(allocation) || allocation < 10 || allocation > 90 ||
        !['help_rate', 'completion_rate'].includes(primary)) {
      return res.status(400).json({ error: 'Provide a name, hypothesis, valid allocation, and outcome.' });
    }
    if (experiments.length >= 20) return res.status(400).json({ error: 'This demo supports up to 20 experiments.' });
    const experiment = { id: `study-${experiments.length + 1}`, name: name.trim(), hypothesis: hypothesis.trim(), allocation, primary, status: 'draft' };
    experiments.push(experiment);
    res.status(201).json(experiment);
  });
  router.patch('/experiments/:id', (req, res) => {
    const experiment = experiments.find(item => item.id === req.params.id);
    if (!experiment) return res.status(404).json({ error: 'Experiment not found.' });
    if (!['running', 'paused'].includes(req.body.status)) return res.status(400).json({ error: 'Invalid status.' });
    experiment.status = req.body.status;
    res.json(experiment);
  });
  return router;
}
