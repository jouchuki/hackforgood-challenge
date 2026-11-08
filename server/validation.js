import { DEFAULT_INTERVENTION, ORDERS, COUNTERS } from '../core/model.js';
import { BLOCK_TYPES, MESSAGE_STAGES, MAX_BLOCKS_PER_STAGE, MAX_BLOCK_TEXT_LENGTH, MESSAGE_APPEARANCES } from '../core/message-blocks.js';

export class ApiError extends Error {
  constructor(status, message, code = 'invalid_request') { super(message); this.status = status; this.code = code; }
}
export const fail = (message, status = 400, code) => { throw new ApiError(status, message, code); };
export const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
export function exact(value, allowed, required = []) {
  if (!object(value) || Object.keys(value).some(key => !allowed.includes(key)) || required.some(key => !Object.hasOwn(value, key))) fail('The request contains missing or unsupported fields.');
}
export const text = (value, max = 1500) => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
export const countryCode = value => ['OTHER', 'UNKNOWN'].includes(value) || typeof value === 'string' && /^[A-Z]{2}$/.test(value);

export function intervention(value) {
  exact(value, ['name', 'legal', 'country', 'order', 'layout', 'motion', 'en', 'nl', 'blocks', 'appearance'], ['name', 'legal', 'country', 'order', 'layout', 'motion', 'en', 'nl']);
  if (!text(value.name, 100) || typeof value.legal !== 'boolean' || !countryCode(value.country) || !['reading', 'scene', 'plain', 'meaning'].includes(value.layout) || !ORDERS.some(order => JSON.stringify(order) === JSON.stringify(value.order))) fail('Use a supported layout, country, and stage sequence.');
  if(value.layout==='plain'&&JSON.stringify(value.order)!==JSON.stringify(ORDERS[2])) fail('The plain page shows information and support together.');
  if (Object.hasOwn(value, 'appearance') && !MESSAGE_APPEARANCES.includes(value.appearance)) fail('Choose a supported message appearance.');
  exact(value.motion, ['enabled', 'transition', 'holdSeconds'], ['enabled', 'transition', 'holdSeconds']);
  if (typeof value.motion.enabled !== 'boolean' || !['none', 'fade', 'slide'].includes(value.motion.transition) || !Number.isInteger(value.motion.holdSeconds) || value.motion.holdSeconds < 2 || value.motion.holdSeconds > 10) fail('Motion must use a supported transition and a reading hold from 2 to 10 seconds.');
  for (const language of ['en', 'nl']) {
    const fields = Object.keys(DEFAULT_INTERVENTION[language]);
    exact(value[language], fields, fields);
    if (!fields.every(field => text(value[language][field], field.endsWith('Title') || field === 'title' ? 300 : 1500))) fail('Complete all Dutch and English message fields.');
  }
  if (Object.hasOwn(value, 'blocks')) {
    exact(value.blocks, MESSAGE_STAGES, MESSAGE_STAGES);
    const ids = new Set();
    for (const stage of MESSAGE_STAGES) {
      if (!Array.isArray(value.blocks[stage]) || value.blocks[stage].length > MAX_BLOCKS_PER_STAGE) fail('Each message stage supports up to six content blocks.');
      for (const block of value.blocks[stage]) {
        exact(block, ['id', 'type', 'en', 'nl'], ['id', 'type', 'en', 'nl']);
        if (typeof block.id !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(block.id) || ids.has(block.id) || !BLOCK_TYPES.includes(block.type)) fail('Content blocks need unique IDs and a supported type.');
        ids.add(block.id);
        const validCopy = language => typeof block[language] === 'string' && block[language].length <= MAX_BLOCK_TEXT_LENGTH && (block.type === 'divider' || block[language].trim().length > 0);
        if (!validCopy('en') || !validCopy('nl')) fail('Complete each content block in English and Dutch, using at most 600 characters per language.');
      }
    }
  }
  return structuredClone(value);
}

export function studyDraft(value) {
  exact(value, ['name', 'hypothesis', 'primary', 'countries', 'languages', 'arms'], ['name', 'hypothesis', 'primary', 'countries', 'languages', 'arms']);
  if (!text(value.name, 100) || !text(value.hypothesis) || !['help_rate', 'completion_rate'].includes(value.primary)) fail('Provide a study name, hypothesis, and supported primary outcome.');
  if (!Array.isArray(value.countries) || value.countries.length < 1 || value.countries.length > 30 || !value.countries.every(countryCode)) fail('Provide supported country codes.');
  if (!Array.isArray(value.languages) || value.languages.length < 1 || !value.languages.every(lang => ['en', 'nl'].includes(lang)) || new Set(value.languages).size !== value.languages.length) fail('Active studies support Dutch and English.');
  if (!Array.isArray(value.arms) || value.arms.length < 2 || value.arms.length > 4) fail('A study requires two to four variants.');
  const ids = new Set();
  for (const arm of value.arms) {
    exact(arm, ['id', 'name', 'weight', 'intervention'], ['id', 'name', 'weight', 'intervention']);
    if (!['A', 'B', 'C', 'D'].includes(arm.id) || ids.has(arm.id) || !text(arm.name, 100) || !Number.isInteger(arm.weight) || arm.weight < 1 || arm.weight > 99) fail('Variant IDs must be unique A–D with positive allocation percentages.');
    ids.add(arm.id); intervention(arm.intervention);
  }
  if (value.arms.reduce((sum, arm) => sum + arm.weight, 0) !== 100) fail('Variant allocation must total 100%.');
  return structuredClone(value);
}

export function countDelta(value) {
  exact(value, COUNTERS);
  if (!Object.keys(value).length || Object.values(value).some(count => !Number.isSafeInteger(count) || count < 0 || count > 10000) || Object.values(value).every(count => count === 0)) fail('Counts must be non-negative integer deltas with at least one positive value and a maximum of 10,000.');
  return value;
}

export function siteSettings(value) {
  exact(value, ['name', 'origins', 'returnUrl', 'country']);
  if (Object.hasOwn(value, 'name') && !text(value.name, 100)) fail('Provide a platform name.');
  if (Object.hasOwn(value, 'country') && !countryCode(value.country)) fail('Provide a country code.');
  if (Object.hasOwn(value, 'origins')) {
    if (!Array.isArray(value.origins) || value.origins.length > 20 || value.origins.length < 1 || !value.origins.every(origin => {
      try { const url = new URL(origin); return ['http:', 'https:'].includes(url.protocol) && url.origin === origin && !url.username && !url.password; } catch { return false; }
    })) fail('Origins must be HTTP(S) scheme and host values without paths.');
  }
  if (Object.hasOwn(value, 'returnUrl')) {
    if (!text(value.returnUrl, 500) || value.returnUrl.startsWith('//')) fail('Provide a safe HTTP(S) or local return URL.');
    if (!value.returnUrl.startsWith('/')) {
      try { const url = new URL(value.returnUrl); if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) fail('Provide a safe return URL.'); } catch { fail('Provide a safe return URL.'); }
    }
  }
  return value;
}
