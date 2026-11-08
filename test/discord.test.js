import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildReply, commandDefinitions, EPHEMERAL, parseButton, safeOrigin, journeyUrl, shortWarning, syntheticRule } from '../integrations/discord/handlers.js';
import { readBotConfig, readEnvFile, BotConfigError } from '../integrations/discord/config.js';
import { installSyntheticRule, handleInteraction, loadPublishedIntervention } from '../integrations/discord/adapter.js';
import { createBot } from '../integrations/discord/bot.js';
import { registerCommands } from '../integrations/discord/register.js';

const config = { apiOrigin: 'http://127.0.0.1:3000', publicOrigin: 'https://before.example', siteId: 'demo-forum', country: 'NL', allowLocalLinks: false };
const unavailable = async () => { throw new Error('Synthetic unavailable endpoint'); };

test('commands are real slash subcommands without content-reading options', () => {
  assert.equal(commandDefinitions.length, 1);
  assert.equal(commandDefinitions[0].name, 'before');
  assert.deepEqual(commandDefinitions[0].options.map(option => option.name), ['demo', 'support', 'setup']);
  assert.ok(commandDefinitions[0].options.every(option => option.type === 1 && !option.options));
});

test('shared replies are ephemeral, bilingual, bounded, and do not expose identities or tokens', () => {
  const reply = buildReply({ action: 'reflection', language: 'en-GB', config: { ...config, token: 'SYNTHETIC_TOKEN_SENTINEL', userId: 'SYNTHETIC_ID_SENTINEL' } });
  assert.equal(reply.flags, EPHEMERAL);
  assert.deepEqual(reply.allowed_mentions, { parse: [] });
  assert.match(reply.embeds[0].title, /another way/);
  const dutch = buildReply({ action: 'support', language: 'nl-NL', config });
  assert.match(dutch.embeds[0].title, /alleen/);
  assert.ok(dutch.components.flatMap(row => row.components).some(button => button.url === 'https://preventielijn.offlimits.nl'));
  assert.doesNotMatch(JSON.stringify(reply), /SYNTHETIC_TOKEN_SENTINEL|SYNTHETIC_ID_SENTINEL/);
  assert.ok(reply.components.every(row => row.components.length <= 5));
});

test('published authored messages flow into the native payload without arbitrary execution', () => {
  const reply = buildReply({ action: 'reflection', language: 'en', config: { ...config, intervention: { en: { title: 'A custom published title', body: 'Custom text from the shared published configuration.' } } } });
  assert.equal(reply.embeds[0].title, 'A custom published title');
  assert.match(reply.embeds[0].description, /shared published/);
  assert.ok(!Object.hasOwn(reply, 'script'));
});

test('buttons accept only fixed stage/language actions, with no visitor identifiers', () => {
  assert.deepEqual(parseButton('before:nl:support'), { language: 'nl', action: 'support' });
  assert.equal(parseButton('before:en:delete'), null);
  assert.equal(parseButton('before:en:support:user-123'), null);
  assert.equal(parseButton('unrelated:en:support'), null);
});

test('web journey URLs reject unsafe origins and omit unusable remote localhost links by default', () => {
  assert.equal(safeOrigin('javascript:alert(1)'), null);
  assert.equal(safeOrigin('https://user:secret@before.example'), null);
  assert.equal(safeOrigin('https://before.example/private'), null);
  assert.equal(safeOrigin('http://localhost:3000'), null);
  assert.equal(safeOrigin('http://localhost:3000', true), 'http://localhost:3000');
  assert.equal(journeyUrl({ ...config, publicOrigin: null }, 'en'), null);
  const url = new URL(journeyUrl(config, 'nl'));
  assert.equal(url.pathname, '/intervention/demo-forum');
  assert.deepEqual([...url.searchParams.keys()].sort(), ['country', 'lang']);
  assert.equal(url.searchParams.get('lang'), 'nl');
});

test('AutoMod demonstration uses only the fake trigger, no public alert or timeout, and short explanation', () => {
  for (const language of ['en', 'nl']) {
    const rule = syntheticRule(language);
    assert.deepEqual(rule.triggerMetadata.keywordFilter, ['test-trigger-red']);
    assert.equal(rule.actions.length, 1);
    assert.equal(rule.actions[0].type, 1);
    assert.ok(shortWarning(language).length <= 150);
    assert.match(rule.actions[0].metadata.customMessage, /\/before support/);
  }
});

test('setup validates administrator and bot permission and uses the real SDK method shape', async () => {
  let created;
  const guild = { members: { me: { permissions: { has: () => true } } }, autoModerationRules: { fetch: async options => { assert.equal(options.cache, false); return { find: () => undefined }; }, create: async rule => { created = rule; } } };
  assert.equal(await installSyntheticRule(guild, { canManage: false }), 'denied');
  assert.equal(created, undefined);
  assert.equal(await installSyntheticRule(guild, { canManage: true, language: 'nl', botId: 'synthetic-bot' }), 'created');
  assert.equal(created.actions[0].type, 1);
  guild.members.me.permissions.has = () => false;
  assert.equal(await installSyntheticRule(guild, { canManage: true }), 'missingPermission');
  guild.members.me.permissions.has = () => true;
  guild.autoModerationRules.create = async () => { const error = new Error('Do not log SDK request'); error.code = 50013; throw error; };
  assert.equal(await installSyntheticRule(guild, { canManage: true }), 'missingPermission');
});

test('explicit setup repairs only its owned rule and preserves custom warning and other actions', async () => {
  const botId = 'synthetic-bot'; let edits = 0; let creates = 0;
  const foreign = { ...syntheticRule(), creatorId: 'another-bot', enabled: false };
  const owned = { ...syntheticRule(), creatorId: botId, enabled: false };
  owned.actions = [{ type: 1, metadata: { customMessage: 'Keep this moderator-authored text.' } }, { type: 2, metadata: { channelId: '123456789012345678' } }];
  const originalActions = structuredClone(owned.actions);
  owned.edit = async updates => { edits++; Object.assign(owned, updates); };
  const guild = { members: { me: { permissions: { has: () => true } } }, autoModerationRules: { fetch: async () => ({ find: predicate => [foreign, owned].find(predicate) }), create: async () => { creates++; } } };
  assert.equal(await installSyntheticRule(guild, { canManage: true, botId }), 'created');
  assert.equal(owned.enabled, true); assert.deepEqual(owned.actions, originalActions);
  assert.deepEqual(owned.triggerMetadata.keywordFilter, ['test-trigger-red']);
  assert.equal(foreign.enabled, false); assert.equal(creates, 0); assert.equal(edits, 1);
  assert.equal(await installSyntheticRule(guild, { canManage: true, botId }), 'exists'); assert.equal(edits, 1);
});

test('explicit setup adds the block action without aliases and leaves an immutable trigger type intact', async () => {
  let edits = 0; const botId = 'synthetic-bot';
  const owned = { ...syntheticRule(), creatorId: botId, actions: [{ type: 2, metadata: { channelId: '123456789012345678' } }], edit: async updates => { edits++; Object.assign(owned, updates); } };
  const guild = { members: { me: { permissions: { has: () => true } } }, autoModerationRules: { fetch: async () => ({ find: predicate => [owned].find(predicate) }) } };
  assert.equal(await installSyntheticRule(guild, { canManage: true, botId }), 'created');
  assert.deepEqual(owned.triggerMetadata.keywordFilter, ['test-trigger-red']);
  assert.deepEqual(owned.actions.map(action => action.type), [2, 1]);
  assert.equal(owned.actions[0].metadata.channelId, '123456789012345678');
  owned.triggerType = 3;
  assert.equal(await installSyntheticRule(guild, { canManage: true, botId }), 'error'); assert.equal(edits, 1);
});

test('real SDK interaction adapter defers ephemeral reply and edits through shared renderer with no analytics call', async () => {
  let deferred;
  let edited;
  let fetches = 0;
  const interaction = { locale: 'nl', commandName: 'before', options: { getSubcommand: () => 'support' }, isChatInputCommand: () => true, isButton: () => false, deferReply: async payload => { deferred = payload; }, editReply: async payload => { edited = payload; } };
  const fetcher = async url => { fetches++; assert.match(String(url), /\/api\/public\/sites\/demo-forum\/config/); assert.doesNotMatch(String(url), /metrics|user|token/); return { ok: false }; };
  assert.equal(await handleInteraction(interaction, config, { fetcher }), true);
  assert.equal(deferred.flags, 64);
  assert.match(edited.embeds[0].title, /alleen/);
  assert.deepEqual(edited.allowedMentions, { parse: [] });
  assert.equal(edited.flags, undefined);
  assert.equal(fetches, 1);
});

test('button interactions preserve ephemeral messages and ignore unrelated custom IDs', async () => {
  let updates = 0;
  let edited;
  const interaction = { locale: 'en', customId: 'before:nl:education', isButton: () => true, deferUpdate: async () => { updates++; }, editReply: async payload => { edited = payload; } };
  assert.equal(await handleInteraction(interaction, config, { fetcher: unavailable }), true);
  assert.equal(updates, 1);
  assert.match(edited.embeds[0].title, /kinderen/);
  interaction.customId = 'unrelated';
  assert.equal(await handleInteraction(interaction, config, { fetcher: unavailable }), false);
  assert.equal(updates, 1);
});

test('local configuration rejects missing credentials safely and parses env without evaluating it', async t => {
  assert.throws(() => readBotConfig({ env: {}, envFile: null }), error => error instanceof BotConfigError && /DISCORD_BOT_TOKEN/.test(error.message) && /offline simulator/.test(error.message));
  const directory = await mkdtemp(join(tmpdir(), 'before-discord-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const path = join(directory, '.env');
  await writeFile(path, 'BEFORE_COUNTRY="NL"\nBEFORE_SITE_ID=demo-forum # local install\nDISCORD_BOT_TOKEN=YOUR_BOT_TOKEN\n');
  assert.equal(readEnvFile(path).BEFORE_SITE_ID, 'demo-forum');
  assert.throws(() => readBotConfig({ env: {}, envFile: path }), BotConfigError);
  const ready = readBotConfig({ envFile: null, env: { DISCORD_BOT_TOKEN: 'synthetic-token-value-for-validation-only', DISCORD_APPLICATION_ID: '123456789012345678', DISCORD_TEST_GUILD_ID: '223456789012345678' } });
  assert.equal(ready.publicOrigin, null);
  assert.equal(ready.country, 'NL');
});

test('the real bot enables Guilds only and registers through an injected SDK client without network calls', async () => {
  class MockClient extends EventEmitter { constructor(options) { super(); this.options = options; this.user = { id: 'synthetic-bot' }; } }
  const output = { write: () => {} };
  const client = createBot(config, { ClientClass: MockClient, fetcher: unavailable, output, errors: output });
  assert.deepEqual(client.options.intents, [1]);
  assert.equal(client.listenerCount('interactionCreate'), 1);
  const requests = [];
  await registerCommands({ applicationId: '123456789012345678', guildId: '223456789012345678', token: 'NOT_TRANSMITTED_BY_MOCK' }, { rest: { put: async (path, body) => { requests.push({ path, body }); return []; } } });
  assert.match(requests[0].path, /applications\/123456789012345678\/guilds\/223456789012345678\/commands/);
  assert.deepEqual(requests[0].body.body, commandDefinitions);
});

test('configuration fetch failure preserves bundled native help without leaking request details', async () => {
  const result = await loadPublishedIntervention(config, 'en', unavailable);
  assert.equal(result, config);
  const reply = buildReply({ action: 'support', config: result });
  assert.ok(reply.components.flatMap(row => row.components).some(component => component.url === 'https://preventielijn.offlimits.nl'));
});
