import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter, once } from 'node:events';
import http from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createDiscordConnection, discordInstallUrl } from '../server/discord-connection.js';
import { createApp } from '../server/app.js';
import { commandDefinitions, syntheticRule, SYNTHETIC_RULE_NAME, SYNTHETIC_TERM } from '../integrations/discord/handlers.js';

const applicationId = '123456789012345678';
const guildId = '234567890123456789';
const credential = 'SYNTHETIC_SECRET_NOT_FOR_NETWORK';
const config = { token: credential, applicationId, guildId, siteId: 'demo-forum', country: 'NL', apiOrigin: 'http://127.0.0.1:3000', publicOrigin: null, allowLocalLinks: false };
const strictReader = () => ({ ...config });
function fakeClient({ installed = true, permission = true, commands = false, loginError = false, protection = true } = {}) {
  const client = new EventEmitter();
  let ready = false;
  const stored = new Map(commands ? [['owned', commandDefinitions[0]], ['other', { name: 'unrelated', type: 1, options: [] }]] : [['other', { name: 'unrelated', type: 1, options: [] }]]);
  client.calls = { login: 0, destroy: 0, fetchGuild: 0, createCommand: 0, fetchRules: 0, createRule: 0, editRule: 0 };
  client.user = { id: applicationId };
  client.isReady = () => ready;
  client.login = async token => { assert.equal(token, credential); client.calls.login++; if (loginError) throw new Error('SDK diagnostic includes '+credential); ready = true; client.emit('clientReady'); };
  client.destroy = () => { client.calls.destroy++; ready = false; };
  const ruleStore = new Map();
  const addRule = data => {
    const rule = { id: 'owned-rule', creatorId: applicationId, ...structuredClone(data) };
    rule.edit = async updates => { client.calls.editRule++; Object.assign(rule, structuredClone(updates)); return rule; };
    ruleStore.set(rule.id, rule); return rule;
  };
  if (protection) addRule(syntheticRule());
  const guild = { id: guildId, name: 'Private test server', members: { fetchMe: async () => ({ permissions: { has: value => { assert.equal(value, 32n); return permission; } } }) }, commands: {
    fetch: async () => stored,
    create: async definition => { client.calls.createCommand++; stored.set('owned', structuredClone(definition)); },
  }, autoModerationRules: {
    fetch: async options => { assert.equal(options.cache, false); client.calls.fetchRules++; return { find: predicate => [...ruleStore.values()].find(predicate) }; },
    create: async data => { client.calls.createRule++; return addRule(data); },
  } };
  client.guilds = { fetch: async options => { client.calls.fetchGuild++; assert.equal(options.guild, guildId); assert.equal(options.force, true); if (!installed) { const error = new Error('SDK request contains '+credential); error.code = 50001; throw error; } return guild; } };
  client.guild = guild; client.commands = stored; client.rules = ruleStore;
  return client;
}

test('installation URL contains only app authorization, minimum setup permission and configured server', () => {
  const url = new URL(discordInstallUrl(applicationId, guildId));
  assert.equal(url.origin, 'https://discord.com');
  assert.deepEqual(url.searchParams.get('scope').split(' '), ['bot', 'applications.commands']);
  assert.equal(url.searchParams.get('client_id'), applicationId);
  assert.equal(url.searchParams.get('guild_id'), guildId);
  assert.equal(url.searchParams.get('disable_guild_select'), 'true');
  assert.equal(url.searchParams.get('permissions'), '32');
  assert.equal(discordInstallUrl('bad', guildId), null);
  assert.doesNotMatch(url.href, /token|secret|redirect_uri/);
});

test('status can offer installation without a token; GET status never connects or exposes environment diagnostics', async () => {
  let factories = 0;
  const service = createDiscordConnection({ configReader: ({ requireCredentials }) => { if (requireCredentials) throw new Error('Missing '+credential); return { ...config, token: '' }; }, clientFactory: () => { factories++; return fakeClient(); } });
  assert.equal(service.read().status, 'configuration_required');
  const result = await service.connect();
  assert.equal(result.checks.configuration, false);
  assert.ok(result.installUrl);
  assert.equal(factories, 0);
  assert.doesNotMatch(JSON.stringify(result), new RegExp(credential+'|DISCORD_BOT_TOKEN|stack'));
  service.close();
});

test('connection verifies real readiness, target guild, permissions and command readback while preserving unrelated commands', async () => {
  const client = fakeClient(); const service = createDiscordConnection({ configReader: strictReader, clientFactory: () => client });
  assert.equal(service.read().status, 'disconnected'); assert.equal(client.calls.login, 0);
  const result = await service.connect();
  assert.equal(result.status, 'ready'); assert.ok(Object.values(result.checks).every(Boolean));
  assert.equal(result.serverName, 'Private test server'); assert.ok(result.checkedAt);
  assert.equal(client.calls.createCommand, 1); assert.equal(client.commands.get('other').name, 'unrelated');
  await service.connect(); assert.equal(client.calls.login, 1); assert.equal(client.calls.createCommand, 1);
  assert.doesNotMatch(JSON.stringify(service.read()), new RegExp(credential));
  client.isReady = () => false;
  assert.equal(service.read().status, 'disconnected'); assert.equal(service.read().checks.gateway, false);
  service.close();
});

test('uninstalled and permission-limited servers remain distinct and never claim registered commands', async () => {
  for (const [options, status] of [[{ installed: false }, 'not_installed'], [{ permission: false }, 'permission_required']]) {
    const client = fakeClient(options); const service = createDiscordConnection({ configReader: strictReader, clientFactory: () => client });
    const result = await service.connect();
    assert.equal(result.status, status); assert.equal(result.checks.gateway, true); assert.equal(result.checks.commands, false); assert.equal(client.calls.createCommand, 0);
    assert.doesNotMatch(JSON.stringify(result), new RegExp(credential)); service.close();
  }
});

test('login errors and command failures are sanitized, and command registration requires actual readback', async () => {
  const client = fakeClient({ loginError: true }); let service = createDiscordConnection({ configReader: strictReader, clientFactory: () => client });
  let result = await service.connect(); assert.equal(result.status, 'error'); assert.equal(result.errorCode, 'connection_failed'); assert.doesNotMatch(JSON.stringify(result), new RegExp(credential)); service.close();
  service = createDiscordConnection({ configReader: strictReader, clientFactory: () => { throw new Error('Factory contains '+credential); } });
  result = await service.connect(); assert.equal(result.status, 'error'); assert.doesNotMatch(JSON.stringify(result), new RegExp(credential)); service.close();
  const commandsClient = fakeClient(); commandsClient.guild.commands.create = async () => {};
  service = createDiscordConnection({ configReader: strictReader, clientFactory: () => commandsClient });
  result = await service.connect(); assert.equal(result.status, 'error'); assert.equal(result.errorCode, 'commands_unavailable'); assert.equal(result.checks.commands, false); service.close();
});

test('a bot token for a different application cannot produce a ready connection', async () => {
  const client = fakeClient(); client.user.id = '345678901234567890';
  const service = createDiscordConnection({ configReader: strictReader, clientFactory: () => client });
  const result = await service.connect(); assert.equal(result.status, 'error'); assert.equal(result.errorCode, 'application_mismatch'); assert.equal(client.calls.fetchGuild, 0); assert.equal(result.checks.gateway, false); service.close();
});

test('concurrent verification is deduplicated and slow login times out without late ready state', async () => {
  const client = fakeClient(); let release;
  client.login = () => { client.calls.login++; return new Promise(resolve => { release = resolve; }); };
  const service = createDiscordConnection({ configReader: strictReader, clientFactory: () => client, timeoutMs: 20 });
  const first = service.connect(); const second = service.connect(); assert.equal(first, second);
  const result = await first; assert.equal(result.status, 'error'); assert.equal(result.errorCode, 'connection_timeout'); assert.equal(client.calls.login, 1);
  release(); await new Promise(resolve => setTimeout(resolve, 1)); assert.notEqual(service.read().status, 'ready'); assert.equal(client.calls.fetchGuild, 0); service.close();
});

test('changing local credentials invalidates prior readiness and closes the prior client', async () => {
  let current = { ...config }; const clients = [];
  const service = createDiscordConnection({ configReader: () => ({ ...current }), clientFactory: () => { const client = fakeClient(); clients.push(client); return client; } });
  assert.equal((await service.connect()).status, 'ready');
  current = { ...config, country: 'UNKNOWN' };
  assert.equal(service.read().status, 'disconnected'); assert.equal(clients[0].calls.destroy, 1);
  assert.equal((await service.connect()).status, 'ready'); assert.equal(clients.length, 2); service.close();
});

test('startup and verification report missing or disabled protection without enabling it', async () => {
  for (const missing of [true, false]) {
    const client = fakeClient({ protection: !missing });
    if (!missing) client.rules.get('owned-rule').enabled = false;
    const service = createDiscordConnection({ configReader: strictReader, clientFactory: () => client });
    assert.equal(service.read().checks.protection, false);
    assert.equal(client.calls.fetchRules, 0);
    const result = await service.resume();
    assert.equal(result.status, 'setup_required');
    assert.equal(result.checks.protection, false);
    assert.ok(['configuration', 'gateway', 'server', 'permissions', 'commands'].every(key => result.checks[key]));
    assert.equal((await service.connect()).status, 'setup_required');
    assert.equal(client.calls.createRule, 0); assert.equal(client.calls.editRule, 0);
    service.close();
  }
});

test('rule readback requires the owned name, creator, event, keyword trigger and block action', async () => {
  for (const mutate of [
    rule => { rule.name = 'Unrelated rule'; },
    rule => { rule.creatorId = '345678901234567890'; },
    rule => { rule.eventType = 2; },
    rule => { rule.triggerType = 3; },
    rule => { rule.triggerMetadata.keywordFilter = ['unrelated-test-term']; },
    rule => { rule.actions = [{ type: 2, metadata: { channelId: '456789012345678901' } }]; },
  ]) {
    const client = fakeClient(); mutate(client.rules.get('owned-rule'));
    const service = createDiscordConnection({ configReader: strictReader, clientFactory: () => client });
    const result = await service.resume();
    assert.equal(result.status, 'setup_required'); assert.equal(result.checks.protection, false);
    assert.equal(client.calls.createRule, 0); assert.equal(client.calls.editRule, 0); service.close();
  }
});

test('explicit setup creates and reads back only the owned canonical protection, idempotently', async () => {
  const client = fakeClient({ protection: false });
  const foreign = { id: 'foreign-rule', name: SYNTHETIC_RULE_NAME, creatorId: '345678901234567890', enabled: false, actions: [] };
  client.rules.set(foreign.id, foreign);
  const service = createDiscordConnection({ configReader: strictReader, clientFactory: () => client });
  assert.equal((await service.connect({ enableProtection: true })).status, 'ready');
  assert.equal(service.read().checks.protection, true);
  assert.deepEqual(client.rules.get('owned-rule').triggerMetadata.keywordFilter, [SYNTHETIC_TERM]);
  assert.equal(client.calls.createRule, 1); assert.equal(client.calls.editRule, 0);
  assert.equal(client.rules.get(foreign.id), foreign); assert.equal(foreign.enabled, false);
  assert.equal((await service.connect({ enableProtection: true })).status, 'ready');
  assert.equal(client.calls.createRule, 1); assert.equal(client.calls.editRule, 0);
  assert.ok(client.calls.fetchRules >= 4); service.close();
});

test('explicit setup re-enables the owned rule while preserving its custom warning and other actions', async () => {
  const client = fakeClient(); const rule = client.rules.get('owned-rule');
  rule.enabled = false;
  rule.actions = [{ type: 1, metadata: { customMessage: 'Moderator-authored warning, keep it.' } }, { type: 2, metadata: { channelId: '456789012345678901' } }];
  const actions = structuredClone(rule.actions);
  const service = createDiscordConnection({ configReader: strictReader, clientFactory: () => client });
  assert.equal((await service.resume()).status, 'setup_required'); assert.equal(client.calls.editRule, 0);
  assert.equal((await service.connect({ enableProtection: true })).status, 'ready');
  assert.equal(rule.enabled, true); assert.deepEqual(rule.actions, actions);
  assert.deepEqual(rule.triggerMetadata.keywordFilter, [SYNTHETIC_TERM]);
  assert.equal(client.calls.editRule, 1); assert.equal(client.calls.createRule, 0); service.close();
});

test('protection read failures or failed setup readback cannot report ready or leak SDK errors', async () => {
  let client = fakeClient(); client.guild.autoModerationRules.fetch = async () => { throw new Error(credential); };
  let service = createDiscordConnection({ configReader: strictReader, clientFactory: () => client });
  let result = await service.resume(); assert.equal(result.status, 'protection_error'); assert.equal(result.errorCode, 'protection_unavailable');
  assert.equal(result.checks.protection, false); assert.doesNotMatch(JSON.stringify(result), new RegExp(credential)); service.close();
  client = fakeClient({ protection: false }); client.guild.autoModerationRules.create = async () => { client.calls.createRule++; return {}; };
  service = createDiscordConnection({ configReader: strictReader, clientFactory: () => client });
  result = await service.connect({ enableProtection: true });
  assert.equal(result.status, 'protection_error'); assert.equal(result.errorCode, 'protection_setup_failed'); assert.equal(result.checks.protection, false); service.close();
});

test('Finish setup requested during verification is queued once and never lost or duplicated', async () => {
  const client = fakeClient({ protection: false });
  let release; let started;
  const gate = new Promise(resolve => { release = resolve; });
  const reading = new Promise(resolve => { started = resolve; });
  const fetchRules = client.guild.autoModerationRules.fetch;
  let first = true;
  client.guild.autoModerationRules.fetch = async options => {
    if (first) { first = false; started(); await gate; }
    return fetchRules(options);
  };
  const service = createDiscordConnection({ configReader: strictReader, clientFactory: () => client });
  const verification = service.resume(); await reading;
  const finish = service.connect({ enableProtection: true });
  assert.equal(service.connect({ enableProtection: true }), finish);
  release(); assert.equal((await verification).status, 'setup_required');
  assert.equal((await finish).status, 'ready');
  assert.equal(client.calls.createRule, 1); assert.equal(client.calls.editRule, 0); service.close();
});

test('initial Gateway guild bootstrap is read-only; a fresh authorized installation can finish protection', async () => {
  const client = fakeClient({ protection: false }); let online = false;
  client.isReady = () => online;
  client.login = async () => {
    client.calls.login++; client.emit('guildCreate', { id: guildId });
    online = true; client.emit('clientReady');
  };
  const service = createDiscordConnection({ configReader: strictReader, clientFactory: () => client });
  assert.equal((await service.resume()).status, 'setup_required'); assert.equal(client.calls.createRule, 0);
  client.emit('guildCreate', { id: guildId });
  for (let i = 0; i < 20 && service.read().status !== 'ready'; i++) await new Promise(resolve => setImmediate(resolve));
  assert.equal(service.read().status, 'ready'); assert.equal(client.calls.createRule, 1); service.close();
});

test('failed asynchronous or synchronous SDK teardown cannot escape credential replacement or shutdown', async () => {
  let current = { ...config }; let count = 0;
  const service = createDiscordConnection({ configReader: () => ({ ...current }), clientFactory: () => {
    const client = fakeClient(); count++;
    client.destroy = count === 1 ? async () => { throw new Error('Async SDK diagnostic '+credential); } : () => { throw new Error('Sync SDK diagnostic '+credential); };
    return client;
  } });
  assert.equal((await service.connect()).status, 'ready');
  current = { ...current, country: 'UNKNOWN' };
  assert.equal(service.read().status, 'disconnected');
  // An unhandled destroy rejection fails the Node test runner after this tick.
  await new Promise(resolve => setImmediate(resolve));
  assert.equal((await service.connect()).status, 'ready');
  assert.doesNotThrow(() => service.close());
  assert.notEqual(service.read().status, 'ready');
});

test('moderator-only connection APIs reject credential payloads and keep researcher and public roles separate', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'next-step-discord-'));
  const gatewayKey = 'synthetic-private-test-gateway';
  let connects = 0;
  const status = { status: 'not_installed', applicationId, guildId, installUrl: discordInstallUrl(applicationId, guildId), siteId: 'demo-forum', checks: { configuration: true, gateway: true, server: false, permissions: false, commands: false, protection: false }, serverName: null, checkedAt: null, errorCode: null };
  const app = createApp({ storePath: join(directory, 'state.json'), gatewayKey, discordConnection: { read: () => status, connect: async options => { assert.deepEqual(options, { enableProtection: true }); connects++; return status; }, close() {} } });
  const server = http.createServer(app); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); await rm(directory, { recursive: true, force: true }); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const call = (path, { role, method = 'GET', body, headers = {} } = {}) => fetch(origin+path, { method, headers: { 'x-before-gateway-key': gatewayKey, ...(role ? { Cookie: role } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const login = async role => (await call('/api/session', { method: 'POST', body: { role } })).headers.get('set-cookie').split(';')[0];
  assert.equal((await call('/api/moderator/discord')).status, 403);
  const researcher = await login('researcher'); assert.equal((await call('/api/moderator/discord', { role: researcher })).status, 403);
  const moderator = await login('moderator'); const read = await call('/api/moderator/discord', { role: moderator }); assert.equal(read.status, 200); assert.equal((await read.json()).status, 'not_installed'); assert.equal(connects, 0);
  assert.equal((await call('/api/moderator/discord/connect', { role: moderator, method: 'POST', body: { token: credential } })).status, 400); assert.equal(connects, 0);
  assert.equal((await call('/api/moderator/discord/connect', { role: moderator, method: 'POST', body: {}, headers: { Origin: 'https://unapproved.example' } })).status, 403); assert.equal(connects, 0);
  assert.equal((await call('/api/moderator/discord/connect', { role: moderator, method: 'POST', body: {} })).status, 200); assert.equal(connects, 1);
});
