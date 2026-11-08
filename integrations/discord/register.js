import { REST, Routes } from 'discord.js';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { readBotConfig, BotConfigError } from './config.js';
import { commandDefinitions } from './handlers.js';

export async function registerCommands(config, { rest = new REST({ version: '10' }).setToken(config.token) } = {}) {
  return rest.put(Routes.applicationGuildCommands(config.applicationId, config.guildId), { body: commandDefinitions });
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const config = readBotConfig();
    await registerCommands(config);
    process.stdout.write('Before commands registered in the configured test guild. Invite the application before using them.\n');
    const invite = new URL('https://discord.com/oauth2/authorize');
    invite.searchParams.set('client_id', config.applicationId); invite.searchParams.set('scope', 'bot applications.commands'); invite.searchParams.set('permissions', '32');
    process.stdout.write(`Application installation link: ${invite.href}\n`);
  } catch (error) {
    process.stderr.write(error instanceof BotConfigError ? `${error.message}\n` : 'Command registration failed. Check app credentials, guild access and permissions. No credentials were logged.\n');
    process.exitCode = 1;
  }
}
