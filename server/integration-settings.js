import { readFile, writeFile, rename, mkdir, chmod, rm } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { readBotConfig, readEnvFile } from '../integrations/discord/config.js';
import { safeOrigin } from '../integrations/discord/handlers.js';
import { ApiError, exact, fail } from './validation.js';

const defaultEnvFile = fileURLToPath(new URL('../integrations/discord/.env', import.meta.url));
const fieldKeys = { applicationId: 'DISCORD_APPLICATION_ID', guildId: 'DISCORD_TEST_GUILD_ID', token: 'DISCORD_BOT_TOKEN', clientSecret: 'DISCORD_CLIENT_SECRET', redirectUri: 'DISCORD_OAUTH_REDIRECT_URI', apiOrigin: 'BEFORE_API_ORIGIN', publicOrigin: 'BEFORE_PUBLIC_ORIGIN', siteId: 'BEFORE_SITE_ID', country: 'BEFORE_COUNTRY', allowLocalLinks: 'BEFORE_ALLOW_LOCAL_LINKS' };
const usableToken = value => typeof value === 'string' && value.length >= 24 && value.length <= 512 && /^[A-Za-z0-9_.-]+$/.test(value) && !/^(YOUR_|REPLACE|PASTE|CHANGE|example)/i.test(value);
const snowflake = value => typeof value === 'string' && /^\d{17,22}$/.test(value);

// Mount only behind the existing moderator, local-origin and private-gateway
// middleware. Values are never placed in the shared application state store.
export function createDiscordIntegrationSettings({ envFile = defaultEnvFile, env = process.env, siteExists = () => true } = {}) {
  let saving = Promise.resolve();
  function read() {
    const values = { ...readEnvFile(envFile), ...env };
    let config;
    try { config = readBotConfig({ envFile, env, requireCredentials: false }); }
    catch { config = {}; }
    return {
      applicationId: snowflake(config.applicationId) ? config.applicationId : '',
      guildId: snowflake(config.guildId) ? config.guildId : '',
      tokenConfigured: usableToken(config.token),
      clientSecretConfigured: usableToken(values.DISCORD_CLIENT_SECRET),
      redirectUri: values.DISCORD_OAUTH_REDIRECT_URI || 'http://localhost:3000/api/moderator/integrations/discord/oauth/callback',
      siteId: config.siteId || 'demo-forum', country: config.country || 'NL',
      apiOrigin: config.apiOrigin || 'http://127.0.0.1:3000', publicOrigin: config.publicOrigin || '',
      allowLocalLinks: config.allowLocalLinks === true,
      managedExternally: Object.values(fieldKeys).some(key => Boolean(env[key])),
    };
  }
  async function persist(body) {
    exact(body, Object.keys(fieldKeys));
    const current = { ...readEnvFile(envFile), ...env };
    const changes = {};
    for (const [field, key] of Object.entries(fieldKeys)) {
      if (!Object.hasOwn(body, field)) continue;
      const value = body[field];
      if (['token', 'clientSecret'].includes(field) && value === '') continue;
      if (field === 'allowLocalLinks') {
        if (typeof value !== 'boolean') fail('Use a valid local-link setting.');
        changes[key] = String(value);
      } else {
        if (typeof value !== 'string' || value.length > 600 || /[\r\n\0]/.test(value)) fail('Use valid Discord connection settings.');
        changes[key] = value.trim();
      }
      if (env[key] && changes[key] !== env[key]) fail('This value is managed by the process environment. Update it there before using the dashboard.', 409, 'environment_managed');
    }
    const next = { ...current, ...changes };
    if (!snowflake(next.DISCORD_APPLICATION_ID) || !snowflake(next.DISCORD_TEST_GUILD_ID)) fail('Application ID and server ID must be valid Discord IDs.');
    if (!usableToken(next.DISCORD_BOT_TOKEN)) fail('Add a valid bot token for the first connection. A blank token keeps the existing token.');
    if (next.DISCORD_CLIENT_SECRET && !usableToken(next.DISCORD_CLIENT_SECRET)) fail('Use a valid OAuth client secret. Leave it blank to keep the existing secret.');
    if (next.DISCORD_OAUTH_REDIRECT_URI) {
      try {
        const uri = new URL(next.DISCORD_OAUTH_REDIRECT_URI);
        if (uri.username || uri.password || uri.search || uri.hash || uri.pathname !== '/api/moderator/integrations/discord/oauth/callback' || uri.protocol !== 'https:' && !(uri.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(uri.hostname))) throw Error();
      } catch { fail('Use the registered HTTPS callback URL, or the local localhost callback URL shown in the guide.'); }
    }
    const local = next.BEFORE_ALLOW_LOCAL_LINKS === 'true';
    if (!safeOrigin(next.BEFORE_API_ORIGIN || 'http://127.0.0.1:3000', true)) fail('The configuration service must be an HTTP(S) origin without a path.');
    if (next.BEFORE_PUBLIC_ORIGIN && !safeOrigin(next.BEFORE_PUBLIC_ORIGIN, local)) fail('Use a public HTTP(S) origin for links, or explicitly allow local links.');
    if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(next.BEFORE_SITE_ID || 'demo-forum') || !siteExists(next.BEFORE_SITE_ID || 'demo-forum')) fail('Choose one of your configured platforms.');
    if (!/^[A-Z]{2}$/.test(next.BEFORE_COUNTRY || 'NL') && next.BEFORE_COUNTRY !== 'UNKNOWN') fail('Use a country code or UNKNOWN.');
    try { readBotConfig({ envFile: null, env: next }); }
    catch { fail('Check the application ID, server ID, token and service settings.'); }
    let source = '';
    try { source = await readFile(envFile, 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw new ApiError(500, 'Discord settings could not be loaded.', 'settings_read_failed'); }
    const pending = new Map(Object.entries(changes));
    const lines = source.split(/\r?\n/).map(line => {
      const match = /^\s*(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=/.exec(line);
      if (!match || !Object.hasOwn(changes, match[1])) return line;
      const replacement = `${match[1]}=${changes[match[1]]}`;
      pending.delete(match[1]); return replacement;
    });
    while (lines.length && lines.at(-1) === '') lines.pop();
    for (const [key, value] of pending) lines.push(`${key}=${value}`);
    const temporary = `${envFile}.${randomBytes(6).toString('hex')}.tmp`;
    try {
      await mkdir(dirname(envFile), { recursive: true, mode: 0o700 });
      await writeFile(temporary, `${lines.join('\n')}\n`, { mode: 0o600, flag: 'wx' });
      await chmod(temporary, 0o600);
      await rename(temporary, envFile);
      await chmod(envFile, 0o600);
    } catch {
      await rm(temporary, { force: true }).catch(() => {});
      throw new ApiError(500, 'Discord settings could not be saved.', 'settings_write_failed');
    }
    return read();
  }
  function save(body) {
    const result = saving.then(() => persist(body));
    saving = result.catch(() => {});
    return result;
  }
  return { read, save };
}
