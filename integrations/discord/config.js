import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { safeOrigin } from './handlers.js';

export class BotConfigError extends Error {}
export function readEnvFile(path) {
  if (!path || !existsSync(path)) return {};
  const result = {};
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const match = /^\s*(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (!match) continue;
    let value = match[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    else value = value.replace(/\s+#.*$/, '');
    result[match[1]] = value;
  }
  return result;
}
const configured = value => typeof value === 'string' && value.length > 0 && !/^(YOUR_|REPLACE|PASTE|CHANGE|example)/i.test(value);
export function readBotConfig({ env = process.env, envFile = fileURLToPath(new URL('./.env', import.meta.url)), requireCredentials = true } = {}) {
  const values = { ...readEnvFile(envFile), ...env };
  if (requireCredentials) {
    const missing = ['DISCORD_BOT_TOKEN', 'DISCORD_APPLICATION_ID', 'DISCORD_TEST_GUILD_ID'].filter(key => !configured(values[key]));
    if (missing.length) throw new BotConfigError(`Discord is disconnected. Set ${missing.join(', ')} in integrations/discord/.env. The offline simulator remains available at /demo/discord.`);
    if (!/^\d{17,22}$/.test(values.DISCORD_APPLICATION_ID) || !/^\d{17,22}$/.test(values.DISCORD_TEST_GUILD_ID)) throw new BotConfigError('Application and test-guild IDs must be Discord snowflake values. No credentials were printed.');
    if (values.DISCORD_BOT_TOKEN.length < 24 || /\s/.test(values.DISCORD_BOT_TOKEN)) throw new BotConfigError('The bot token is not configured correctly. Check the local environment file; never paste it into the browser.');
  }
  const apiOrigin = safeOrigin(values.BEFORE_API_ORIGIN || 'http://127.0.0.1:3000', true);
  if (!apiOrigin) throw new BotConfigError('BEFORE_API_ORIGIN must be an HTTP(S) origin without a path.');
  const allowLocalLinks = values.BEFORE_ALLOW_LOCAL_LINKS === 'true';
  const publicOrigin = values.BEFORE_PUBLIC_ORIGIN ? safeOrigin(values.BEFORE_PUBLIC_ORIGIN, allowLocalLinks) : null;
  if (values.BEFORE_PUBLIC_ORIGIN && !publicOrigin) throw new BotConfigError('BEFORE_PUBLIC_ORIGIN must be a reachable HTTP(S) origin. Local links require explicit BEFORE_ALLOW_LOCAL_LINKS=true.');
  const siteId = values.BEFORE_SITE_ID || 'demo-forum';
  if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(siteId)) throw new BotConfigError('BEFORE_SITE_ID must match a configured installation identifier.');
  const country = values.BEFORE_COUNTRY || 'NL';
  if (!/^[A-Z]{2}$/.test(country) && country !== 'UNKNOWN') throw new BotConfigError('BEFORE_COUNTRY must be a country code or UNKNOWN.');
  return { token: values.DISCORD_BOT_TOKEN || null, applicationId: values.DISCORD_APPLICATION_ID || null, guildId: values.DISCORD_TEST_GUILD_ID || null, apiOrigin, publicOrigin, allowLocalLinks, siteId, country };
}
