# Next Step on Discord

Discord bot

Open the moderator dashboard → Integrations → Discord. Configure the application ID, server ID and bot token once as the self-hosted service owner. Existing secrets are kept when their fields are blank. Select Authorize with Discord to install the bot, then Finish setup. The managed service verifies its connection, server permissions, commands and owned test-message AutoMod rule. No Discord slash command is required to install protection.

Optional account sign-in uses a separate OAuth2 Authorization Code flow with PKCE and scopes identify and guilds. Configure the client secret and register the exact callback URL displayed under account sign-in settings. Provider tokens stay in server memory for at most one hour; the browser receives only a necessary HttpOnly session cookie. The UI never claims account authorization is complete until the callback and provider requests succeed.

Use test-trigger-red as a regular member. Discord exempts administrators and members with Manage Server from AutoMod. Existing warning text is preserved. Native Discord interactions are not sent to the research collector.

## Integration scope

The bot handles private support interactions and the canonical test-trigger-red AutoMod rule. It does not read arbitrary messages, native searches or drafts.

## Documentation

- [Discord application installation](https://docs.discord.com/developers/quick-start/getting-started)
- [Discord AutoMod](https://docs.discord.com/developers/resources/auto-moderation)
