import { Client, Events, GatewayIntentBits } from 'discord.js';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { readBotConfig, BotConfigError } from './config.js';
import { handleInteraction } from './adapter.js';

export function createBot(config, { ClientClass = Client, fetcher = fetch, output = process.stdout, errors = process.stderr } = {}) {
  const client = new ClientClass({ intents: [GatewayIntentBits.Guilds] });
  client.once(Events.ClientReady, () => output.write('Before Discord bot connected. Native interactions enabled; visitor tracking is disabled.\n'));
  client.on(Events.InteractionCreate, async interaction => {
    try { await handleInteraction(interaction, config, { fetcher, botId: client.user?.id }); }
    catch {
      errors.write('A Discord interaction could not complete. No interaction data was logged.\n');
      try {
        const content = 'The support interaction could not complete. Try /before support again.';
        if (interaction.deferred || interaction.replied) await interaction.editReply({ content, embeds: [], components: [] });
        else await interaction.reply({ content, flags: 64, allowedMentions: { parse: [] } });
      } catch { /* No retry loop or raw Discord error dump. */ }
    }
  });
  client.on(Events.Error, () => errors.write('Discord connection error. Check connectivity and local app configuration. No request data was logged.\n'));
  return client;
}

export async function startBot(options = {}) {
  let config;
  try { config = readBotConfig(options); }
  catch (error) { if (error instanceof BotConfigError) { process.stderr.write(`${error.message}\n`); return false; } throw error; }
  const client = createBot(config);
  const shutdown = () => { client.destroy(); process.exitCode = 0; };
  process.once('SIGINT', shutdown); process.once('SIGTERM', shutdown);
  try { await client.login(config.token); return client; }
  catch { client.destroy(); process.stderr.write('Discord login failed. Verify the local token and network connection. No credentials were logged.\n'); return false; }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const client = await startBot(); if (!client) process.exitCode = 1;
}
