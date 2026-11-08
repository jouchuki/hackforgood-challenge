import { createHash } from 'node:crypto';
import { readBotConfig } from '../integrations/discord/config.js';
import { createBot } from '../integrations/discord/bot.js';
import { commandDefinitions } from '../integrations/discord/handlers.js';
import { SYNTHETIC_RULE_NAME } from '../integrations/discord/handlers.js';
import { installSyntheticRule, isSyntheticProtectionRule } from '../integrations/discord/adapter.js';

const snowflake = value => typeof value === 'string' && /^\d{17,22}$/.test(value);
const quiet = { write() {} };
const blankChecks = configuration => ({ configuration, gateway: false, server: false, permissions: false, commands: false, protection: false });

export function discordInstallUrl(applicationId, guildId) {
  if (!snowflake(applicationId)) return null;
  const url = new URL('https://discord.com/oauth2/authorize');
  url.searchParams.set('client_id', applicationId);
  url.searchParams.set('scope', 'bot applications.commands');
  url.searchParams.set('permissions', '32');
  url.searchParams.set('integration_type', '0');
  if (snowflake(guildId)) {
    url.searchParams.set('guild_id', guildId);
    url.searchParams.set('disable_guild_select', 'true');
  }
  return url.href;
}

const hasCommands = commands => commandDefinitions.every(definition => [...commands.values()].some(command =>
  command.name === definition.name && Number(command.type) === 1 &&
  definition.options.every(option => command.options?.some(actual => actual.name === option.name && Number(actual.type) === option.type))
));

// One locally owned application and server. Only connection facts are returned;
// credentials, Discord interactions and member records never enter app storage.
export function createDiscordConnection({
  configReader = options => readBotConfig(options),
  clientFactory = config => createBot(config, { output: quiet, errors: quiet }),
  timeoutMs = 10000,
  now = () => new Date().toISOString(),
} = {}) {
  let client = null;
  let fingerprint = null;
  let generation = 0;
  let operation = null;
  let operationProtection = false;
  let protectionUpgrade = null;
  let cancelReady = null;
  let closed = false;
  let state = { status: 'disconnected', checks: blankChecks(false), serverName: null, checkedAt: null, errorCode: null };

  function configuration() {
    let loose;
    try { loose = configReader({ requireCredentials: false }); } catch { loose = {}; }
    let strict = null;
    try { strict = configReader({ requireCredentials: true }); } catch { /* The browser receives no environment diagnostics. */ }
    const applicationId = snowflake(loose.applicationId) ? loose.applicationId : null;
    const guildId = snowflake(loose.guildId) ? loose.guildId : null;
    return {
      config: strict,
      fingerprint: strict ? createHash('sha256').update(JSON.stringify(strict)).digest('hex') : null,
      applicationId, guildId,
      installUrl: discordInstallUrl(applicationId, guildId),
      siteId: typeof loose.siteId === 'string' ? loose.siteId : null,
    };
  }
  function destroyClient() {
    generation++;
    cancelReady?.(); cancelReady = null;
    const previous = client;
    client = null;
    fingerprint = null;
    // SDK teardown is asynchronous. A failed socket close must not crash the
    // application or leak the SDK diagnostic during shutdown/credential change.
    try { void Promise.resolve(previous?.destroy()).catch(() => {}); } catch { /* Sanitized teardown. */ }
  }
  function reconcile(config) {
    if (!config.config) {
      if (client) destroyClient();
      state = { status: 'configuration_required', checks: blankChecks(false), serverName: null, checkedAt: state.checkedAt, errorCode: 'configuration_required' };
    } else if (fingerprint && fingerprint !== config.fingerprint) {
      destroyClient();
      state = { status: 'disconnected', checks: blankChecks(true), serverName: null, checkedAt: null, errorCode: null };
    } else {
      state.checks.configuration = true;
      if (state.status === 'configuration_required') state = { status: 'disconnected', checks: blankChecks(true), serverName: null, checkedAt: null, errorCode: null };
      if (state.checks.gateway && !client?.isReady()) {
        state.status = 'disconnected';
        state.checks.gateway = false;
        state.checks.commands = false;
        state.checks.protection = false;
      }
    }
  }
  function snapshot(config = configuration()) {
    reconcile(config);
    return { ...state, checks: { ...state.checks }, applicationId: config.applicationId, guildId: config.guildId, installUrl: config.installUrl, siteId: config.siteId };
  }
  function read() { return snapshot(); }

  async function perform(config, expectedGeneration, enableProtection) {
    const active = () => { if (generation !== expectedGeneration || closed) throw new Error('connection_cancelled'); };
    let stage = 'login';
    try {
      if (!client.isReady()) {
        let listener;
        const ready = new Promise(resolve => { listener = resolve; cancelReady = resolve; client.once('clientReady', listener); });
        const target = client;
        try {
          await target.login(config.token); active();
          if (!target.isReady()) await ready;
          active();
        } finally { target.off('clientReady', listener); if (cancelReady === listener) cancelReady = null; }
      }
      state.checks.gateway = true;
      if (client.user?.id !== config.applicationId) {
        state.status = 'error'; state.errorCode = 'application_mismatch';
        destroyClient(); state.checks.gateway = false;
        return;
      }
      stage = 'server';
      let guild;
      try { guild = await client.guilds.fetch({ guild: config.guildId, force: true }); }
      catch (error) {
        active();
        if ([10004, 50001].includes(Number(error?.code))) {
          state.status = 'not_installed'; state.errorCode = 'server_unavailable'; return;
        }
        throw error;
      }
      active();
      state.checks.server = true;
      state.serverName = String(guild.name || '').slice(0, 100) || null;
      stage = 'permissions';
      const member = await guild.members.fetchMe({ force: true }); active();
      if (!member.permissions.has(32n)) {
        state.status = 'permission_required'; state.errorCode = 'manage_server_required'; return;
      }
      state.checks.permissions = true;
      stage = 'commands';
      let commands = await guild.commands.fetch(); active();
      if (!hasCommands(commands)) {
        // POST upserts this app's named command; unrelated commands are retained.
        for (const definition of commandDefinitions) { await guild.commands.create(definition); active(); }
        commands = await guild.commands.fetch(); active();
      }
      if (!hasCommands(commands)) throw new Error('commands_unverified');
      state.checks.commands = true;
      stage = 'protection';
      const ownedRule = rules => rules.find(rule => rule.name === SYNTHETIC_RULE_NAME && rule.creatorId === client.user.id);
      let rules = await guild.autoModerationRules.fetch({ cache: false }); active();
      let protectedRule = isSyntheticProtectionRule(ownedRule(rules), client.user.id);
      if (!protectedRule && enableProtection) {
        const result = await installSyntheticRule(guild, { canManage: true, botId: client.user.id }); active();
        if (result === 'missingPermission') {
          state.checks.permissions = false;
          state.status = 'permission_required'; state.errorCode = 'manage_server_required'; return;
        }
        if (!['created', 'exists'].includes(result)) {
          state.status = 'protection_error'; state.errorCode = 'protection_setup_failed'; return;
        }
        rules = await guild.autoModerationRules.fetch({ cache: false }); active();
        protectedRule = isSyntheticProtectionRule(ownedRule(rules), client.user.id);
        if (!protectedRule) {
          state.status = 'protection_error'; state.errorCode = 'protection_setup_failed'; return;
        }
      }
      if (!protectedRule) {
        state.status = 'setup_required'; state.errorCode = null; return;
      }
      state.checks.protection = true;
      state.status = 'ready'; state.errorCode = null;
    } catch {
      if (generation !== expectedGeneration || closed) return;
      state.status = stage === 'protection' ? 'protection_error' : 'error';
      state.errorCode = stage === 'protection' ? (enableProtection ? 'protection_setup_failed' : 'protection_unavailable') : stage === 'login' ? 'connection_failed' : stage === 'commands' ? 'commands_unavailable' : 'verification_failed';
      if (stage === 'login') { destroyClient(); state.checks.gateway = false; }
    }
  }

  function connect({ enableProtection = false } = {}) {
    if (operation) {
      if (enableProtection && !operationProtection && !protectionUpgrade) {
        // Preserve an explicit Finish setup request that arrives while startup
        // verification is running. All such requests share one queued upgrade.
        protectionUpgrade = operation.then(result => {
          const connected = ['configuration', 'gateway', 'server', 'permissions', 'commands'].every(key => result.checks[key]);
          return connected && !result.checks.protection && !closed ? connect({ enableProtection: true }) : result;
        }).finally(() => { protectionUpgrade = null; });
      }
      return protectionUpgrade || operation;
    }
    if (closed) return Promise.resolve(read());
    const resolved = configuration(); reconcile(resolved);
    if (!resolved.config) return Promise.resolve(snapshot(resolved));
    state = { status: 'connecting', checks: blankChecks(true), serverName: null, checkedAt: null, errorCode: null };
    if (!client) {
      try { client = clientFactory(resolved.config); }
      catch {
        state = { status: 'error', checks: blankChecks(true), serverName: null, checkedAt: now(), errorCode: 'connection_failed' };
        return Promise.resolve(snapshot(resolved));
      }
      fingerprint = resolved.fingerprint;
      client.on('guildCreate', guild => { if (guild.id === resolved.config.guildId && !closed && client?.isReady()) void connect({ enableProtection: true }); });
      client.on('guildDelete', guild => {
        if (guild.id !== resolved.config.guildId) return;
        state = { status: 'not_installed', checks: { ...blankChecks(true), gateway: client?.isReady() === true }, serverName: null, checkedAt: now(), errorCode: 'server_unavailable' };
      });
    }
    const expectedGeneration = generation;
    operationProtection = enableProtection;
    let timer;
    operation = Promise.race([
      perform(resolved.config, expectedGeneration, enableProtection),
      new Promise(resolve => { timer = setTimeout(() => {
        destroyClient();
        state = { status: 'error', checks: blankChecks(true), serverName: null, checkedAt: now(), errorCode: 'connection_timeout' };
        resolve();
      }, timeoutMs); }),
    ]).then(() => {
      state.checkedAt = now();
      return snapshot();
    }).finally(() => { clearTimeout(timer); operation = null; operationProtection = false; });
    return operation;
  }

  function close() { closed = true; destroyClient(); state = { status: 'disconnected', checks: blankChecks(false), serverName: null, checkedAt: null, errorCode: null }; }
  return { read, connect, resume: () => connect({ enableProtection: false }), close };
}
