export const BLOCK_TYPES = Object.freeze(['text', 'callout', 'quote', 'list', 'divider']);
export const MESSAGE_STAGES = Object.freeze(['reflection', 'education', 'support']);
export const MAX_BLOCKS_PER_STAGE = 6;
export const MAX_BLOCK_TEXT_LENGTH = 600;
export const MESSAGE_APPEARANCES = Object.freeze(['default', 'facts', 'quick-help', 'guided']);

const examples = {
  text: {
    en: 'You can choose a different next step. Support remains available whenever you want to explore it.',
    nl: 'Je kunt een andere volgende stap kiezen. Er blijft hulp beschikbaar wanneer je die wilt verkennen.',
  },
  callout: {
    en: 'You can go straight to support at any point.',
    nl: 'Je kunt op elk moment direct naar hulp gaan.',
  },
  quote: {
    en: 'What would you like your next choice to make possible?',
    nl: 'Wat zou je met je volgende keuze mogelijk willen maken?',
  },
  list: {
    en: 'Step away from the screen\nRead the information\nExplore a support option',
    nl: 'Neem afstand van het scherm\nLees de informatie\nVerken een vorm van hulp',
  },
  divider: { en: '', nl: '' },
};

/** Editable content IDs identify authored blocks, never visitors or sessions. */
export function createMessageBlock(type = 'text') {
  if (!BLOCK_TYPES.includes(type)) throw new Error('Choose a supported content block.');
  const suffix = globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return { id: `block-${suffix}`, type, ...examples[type] };
}

/** Defensive rendering boundary; the API separately rejects malformed blocks. */
export function stageBlocks(intervention, stage) {
  if (!MESSAGE_STAGES.includes(stage) || !Array.isArray(intervention?.blocks?.[stage])) return [];
  return intervention.blocks[stage].slice(0, MAX_BLOCKS_PER_STAGE).filter(block =>
    block && typeof block === 'object' && /^[A-Za-z0-9_-]{1,64}$/.test(block.id || '') &&
    BLOCK_TYPES.includes(block.type) && typeof block.en === 'string' && typeof block.nl === 'string'
  );
}

export function blockPlainText(intervention, stage, language = 'en') {
  const locale = language === 'nl' ? 'nl' : 'en';
  return stageBlocks(intervention, stage)
    .filter(block => block.type !== 'divider')
    .map(block => block[locale])
    .join('\n\n');
}
