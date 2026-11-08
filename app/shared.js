export const defaultConfig = {
  revision: 1,
  name: 'A moment to choose',
  legal: true,
  country: 'NL',
  en: {
    title: 'There is another way forward.',
    body: 'A single moment does not have to decide what comes next. Think about the people, relationships, and future you want to protect. You can choose a different next step.',
    button: 'Take the next step',
  },
  nl: {
    title: 'Er is een andere weg vooruit.',
    body: 'Eén moment hoeft niet te bepalen wat er hierna gebeurt. Denk aan de mensen, relaties en toekomst die je wilt beschermen. Je kunt kiezen voor een andere volgende stap.',
    button: 'Zet de volgende stap',
  },
};

export const initialExperiments = [{
  id: 'reflection-first',
  name: 'A moment before the message',
  hypothesis: 'A supportive reflection before the warning may increase engagement with help resources.',
  allocation: 50,
  status: 'running',
  primary: 'help_rate',
}];

export function makeSyntheticSeries(multiplier = 1) {
  return Array.from({ length: 14 }, (_, i) => ({
    day: i + 1,
    a: Math.round((290 + i * 18 + [55, 32, 96, 48, 77, 16, 34][i % 7]) * multiplier),
    b: Math.round((305 + i * 17 + [34, 64, 75, 35, 94, 42, 51][i % 7]) * multiplier),
  }));
}

export function syntheticSummary(series) {
  const a = series.reduce((s, d) => s + d.a, 0);
  const b = series.reduce((s, d) => s + d.b, 0);
  return {
    shown: a + b,
    help: Math.round(a * 0.087) + Math.round(b * 0.114),
    closed: Math.round((a + b) * 0.29),
    variants: [
      { id: 'A', name: 'Immediate warning', shown: a, help: Math.round(a * 0.087), closed: Math.round(a * 0.31) },
      { id: 'B', name: 'Reflection first', shown: b, help: Math.round(b * 0.114), closed: Math.round(b * 0.27) },
    ],
    duration: [
      { label: 'Under 10s', count: Math.round((a + b) * 0.18) },
      { label: '10–30s', count: Math.round((a + b) * 0.43) },
      { label: '30–60s', count: Math.round((a + b) * 0.27) },
      { label: 'Over 60s', count: Math.round((a + b) * 0.12) },
    ],
  };
}

export const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function preferredLanguage(languages = []) {
  for (const language of languages) {
    const base = language.toLowerCase().split('-')[0];
    if (base === 'nl' || base === 'en') return base;
  }
  return 'en';
}
