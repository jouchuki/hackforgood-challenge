// Shared, browser-safe interaction rendering. No user IDs, telemetry or storage.
export const EPHEMERAL = 64;
export const SYNTHETIC_RULE_NAME = 'Before · synthetic prevention demo';
export const SYNTHETIC_TERM = 'test-trigger-red';
export const commandDefinitions = [{
  name: 'before', description: 'Open prevention support or try the synthetic Next Step demo.', type: 1,
  options: [
    { name: 'demo', description: 'Try a synthetic prevention interaction; no real content is checked.', type: 1 },
    { name: 'support', description: 'See support resources in a reply visible only to you.', type: 1 },
    { name: 'setup', description: 'Administrator: install the fake test-trigger-red AutoMod demonstration.', type: 1 },
  ],
}];

export const languageFor = locale => String(locale || '').toLowerCase().split('-')[0] === 'nl' ? 'nl' : 'en';
const stages = ['reflection', 'education', 'support'];
export function parseButton(customId) {
  const match = /^before:(en|nl):(reflection|education|support)$/.exec(String(customId));
  return match ? { language: match[1], action: match[2] } : null;
}

export function safeOrigin(value, allowLocal = false) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) return null;
    const host = url.hostname.replace(/^\[|\]$/g, '');
    const local = host === 'localhost' || host.endsWith('.localhost') || host === '::1' || /^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host) || host === '0.0.0.0';
    if (local && !allowLocal) return null;
    return url.origin;
  } catch { return null; }
}

export function journeyUrl(config, language) {
  const origin = safeOrigin(config.publicOrigin, config.allowLocalLinks === true);
  if (!origin || !/^[a-z0-9][a-z0-9-]{0,79}$/.test(config.siteId || '')) return null;
  const url = new URL(`/intervention/${config.siteId}`, origin);
  url.searchParams.set('lang', languageFor(language));
  url.searchParams.set('country', /^[A-Z]{2}$/.test(config.country || '') ? config.country : 'UNKNOWN');
  return url.href;
}

const copy = {
  en: {
    title: 'There is another way forward.', body: 'A moment can open a different next step. Think about the people, relationships, and future you want to protect. You can stop here and choose support.',
    educationTitle: 'Your choices can protect children.', education: 'Sexual abuse material involves harm to children. Choosing not to seek or share it is a step you can take now. If you are worried about your thoughts or behaviour, professional support is available.',
    helpTitle: 'You do not have to figure this out alone.', help: 'Choose a next step that feels possible. Independent support services can explain their availability, supported languages, and confidentiality terms.',
    understand: 'Understand the impact', support: 'Find support', reflect: 'A moment to reflect', open: 'Open the full-page journey', privacy: 'Visible only to you. Discord still processes interactions; this is not a promise of anonymity to Discord. Next Step does not send Discord identities or messages to its research dashboard.',
    offlimits: 'Offlimits · Dutch support', selfhelp: 'Dutch self-help', international: 'International self-help',
    setupTitle: 'Synthetic AutoMod setup',
    setupCreated: 'The synthetic AutoMod rule is enabled. It blocks only the fake test-trigger-red example and points to /before support. No alert channel, timeout, or message-content collection is configured.',
    setupExists: 'This bot already has its synthetic AutoMod rule installed. Use the fake test-trigger-red example, or open /before support.',
    setupDenied: 'Only a server moderator with Manage Server can install this synthetic rule. Support commands remain available.',
    setupMissing: 'The bot needs Manage Server permission to configure AutoMod. Grant that permission to the app, then try /before setup again.',
    setupError: 'The setup could not be completed. Check the app permissions and AutoMod rule limit, then try again. No message content was logged.',
    shortWarning: 'Pause here. Support is available. Use /before support for private help options.',
  },
  nl: {
    title: 'Er is een andere weg vooruit.', body: 'Een moment kan ruimte geven voor een andere volgende stap. Denk aan de mensen, relaties en toekomst die je wilt beschermen. Je kunt hier stoppen en kiezen voor hulp.',
    educationTitle: 'Jouw keuzes kunnen kinderen beschermen.', education: 'Materiaal van seksueel kindermisbruik brengt kinderen schade toe. Je kunt nu kiezen om er niet naar te zoeken en het niet te delen. Bij zorgen over je gedachten of gedrag is professionele ondersteuning beschikbaar.',
    helpTitle: 'Je hoeft dit niet alleen uit te zoeken.', help: 'Kies een volgende stap die haalbaar voelt. Onafhankelijke hulpdiensten leggen hun beschikbaarheid, talen en voorwaarden voor vertrouwelijkheid uit.',
    understand: 'Begrijp de gevolgen', support: 'Vind ondersteuning', reflect: 'Even stilstaan', open: 'Open de volledige interventie', privacy: 'Alleen voor jou zichtbaar. Discord verwerkt interacties wel; dit belooft geen anonimiteit tegenover Discord. Next Step stuurt geen Discord-identiteiten of berichten naar het onderzoeksdashboard.',
    offlimits: 'Offlimits · Nederlandstalige hulp', selfhelp: 'Nederlandstalige zelfhulp', international: 'Internationale zelfhulp',
    setupTitle: 'Synthetische AutoMod instellen',
    setupCreated: 'De synthetische AutoMod-regel staat aan. Deze blokkeert alleen het nepvoorbeeld test-trigger-red en verwijst naar /before support. Er is geen meldkanaal, time-out of verzameling van berichtinhoud ingesteld.',
    setupExists: 'Deze bot heeft zijn synthetische AutoMod-regel al ingesteld. Gebruik het nepvoorbeeld test-trigger-red of open /before support.',
    setupDenied: 'Alleen een servermoderator met Server beheren kan deze synthetische regel installeren. Hulpcommando’s blijven beschikbaar.',
    setupMissing: 'De bot heeft Server beheren nodig om AutoMod in te stellen. Geef de app die toestemming en probeer /before setup opnieuw.',
    setupError: 'Instellen is niet gelukt. Controleer de apprechten en het aantal AutoMod-regels en probeer opnieuw. Er is geen berichtinhoud gelogd.',
    shortWarning: 'Sta hier even stil. Er is hulp. Gebruik /before support voor privé getoonde hulpopties.',
  },
};
export const shortWarning = language => copy[languageFor(language)].shortWarning;
const button = (label, customId, style = 2) => ({ type: 2, style, label, custom_id: customId });
const link = (label, url) => ({ type: 2, style: 5, label, url });
const row = components => ({ type: 1, components });

export function buildReply({ action = 'reflection', language = 'en', config = {}, setupState } = {}) {
  const lang = languageFor(language);
  const l = copy[lang];
  const authored = config.intervention?.[lang];
  const stage = stages.includes(action) ? action : 'reflection';
  const title = stage === 'reflection' ? authored?.title || l.title : stage === 'education' ? authored?.educationTitle || l.educationTitle : authored?.helpTitle || l.helpTitle;
  const body = stage === 'reflection' ? authored?.body || l.body : stage === 'education' ? authored?.educationBody || l.education : authored?.helpBody || l.help;
  const payload = { flags: EPHEMERAL, allowed_mentions: { parse: [] }, embeds: [{ title: String(title).slice(0, 256), description: String(body).slice(0, 1800), color: 0x244d3d, footer: { text: l.privacy } }], components: [] };
  if (action === 'setup') {
    payload.embeds[0].title = l.setupTitle;
    payload.embeds[0].description = setupState === 'created' ? l.setupCreated : setupState === 'exists' ? l.setupExists : setupState === 'denied' ? l.setupDenied : setupState === 'missingPermission' ? l.setupMissing : l.setupError;
  }
  if (stage === 'support' && action !== 'setup') {
    payload.components.push(row(config.country === 'NL' ? [link(l.offlimits, 'https://preventielijn.offlimits.nl'), link(l.selfhelp, 'https://stoppen-is-mogelijk.eu')] : [link(l.international, 'https://www.suojellaanlapsia.fi/en/redirection')]));
  }
  const next = stage === 'reflection' ? [button(l.understand, `before:${lang}:education`, 1), button(l.support, `before:${lang}:support`)] : stage === 'education' ? [button(l.support, `before:${lang}:support`, 1), button(l.reflect, `before:${lang}:reflection`)] : [button(l.reflect, `before:${lang}:reflection`)];
  if (action === 'setup') next.splice(0, next.length, button(l.support, `before:${lang}:support`, 1));
  const fullPage = journeyUrl(config, lang);
  if (fullPage) next.push(link(l.open, fullPage));
  payload.components.push(row(next));
  payload.components.push(row([button('English', `before:en:${stage}`), button('Nederlands', `before:nl:${stage}`)]));
  return payload;
}

export function syntheticRule(language = 'en') {
  return {
    name: SYNTHETIC_RULE_NAME, eventType: 1, triggerType: 1,
    triggerMetadata: { keywordFilter: [SYNTHETIC_TERM] },
    actions: [{ type: 1, metadata: { customMessage: shortWarning(language).slice(0, 150) } }],
    enabled: true,
  };
}
