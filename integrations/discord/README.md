# Next Step Discord integration

This package contains a real official Discord bot and an offline simulator using the same message handlers. The repository demo does not connect to Discord until its owner supplies application credentials. Native interactions send no Discord user IDs, guild-member data, or messages to Next Step research or analytics.

## Dashboard setup

The local Next Step service manages the bot process. The deployment owner configures `integrations/discord/.env` once with the application ID, server ID and bot token, then starts Next Step with `npm start` (after building) or `npm run dev`. Credentials remain on the server. The dashboard does not accept, return or store the token.

A moderator opens **Integrations → Discord**, selects **Add to Discord**, authorizes the app and returns to **Finish setup**. The service confirms its Gateway connection, access to the configured server, Manage Server permission, actual command registration and the enabled bot-owned AutoMod rule before showing Ready. It upserts only its own named command and retains unrelated application commands. Installation events trigger verification automatically while the local service is running. Finishing setup creates or enables the synthetic AutoMod rule and verifies it. A fresh bot installation also completes this step automatically while the service is running. A normal restart only checks the rule, preserving an intentionally disabled rule. No Discord setup command is required in the dashboard flow. Test `test-trigger-red` as a regular member: Discord exempts administrators and members with Manage Server from AutoMod.

This bounded local installation connects one configured application and test server. The server dropdown is preselected in the authorization link. Keep the local Next Step process running while using the bot. Do not also run the standalone bot against the same token.

## Standalone bot setup

1. Install the root project dependencies and start Before with `npm run dev`.
2. Create a Discord developer application and bot, and a private synthetic test guild.
3. Copy `.env.example` to `.env` in this directory. Fill the bot token, application ID, and private test guild ID locally. Use the protected local owner form or edit the ignored environment file; never commit the token.
4. Intentionally run `npm run bot:register` to register `/before` in that guild. Use its printed application-install link to authorize the bot. AutoMod setup needs Manage Server permission.
5. Run `npm run bot`. No privileged Message Content intent is requested.

The package needs the root `discord.js` dependency. In a downloaded standalone ZIP, install the included package dependencies before running `node bot.js` or `node register.js`.

## Commands

- `/before demo`: a synthetic reflection and education interaction.
- `/before support`: support options in an ephemeral reply.
- `/before setup`: administrator-requested AutoMod configuration that blocks only `test-trigger-red`. No real detection vocabulary, alert-channel logging, timeout, or user profiling is included.

All support interactions have English/Dutch buttons and an immediate route to help. Ephemeral means other community members cannot see the reply; Discord still processes the interaction. The bot does not monitor native Discord searches, arbitrary drafts, or other people's private messages.

## Links and hosting

`BEFORE_API_ORIGIN` is the configuration service the bot itself can reach. `BEFORE_PUBLIC_ORIGIN` is optional and must be reachable by the person clicking a full-page link. They are different settings. Leaving the public origin empty keeps native support working. Localhost links require explicit `BEFORE_ALLOW_LOCAL_LINKS=true` for a same-machine rehearsal; they do not work for remote community members.

The country is a deployment setting or an explicit choice in the web journey, never derived from Discord identities or a member IP. The web journey uses the usual aggregate-only counter path when someone follows it; native Discord API data is not forwarded there.

## Offline simulator and verification

Open `/demo/discord`. It uses `handlers.js`, the same pure message builder as the real SDK adapter. Its connection state remains **Not connected to Discord**. No account, token, guild, or external API is required. The simulator's setup success describes a simulated SDK outcome, not an installed real rule.

`node --test test/discord.test.js` checks the shared payloads, English/Dutch actions, safe URLs, SDK interaction dispatch, permission failures, environment errors, command definitions, and registration request shape without making Discord calls. A real guild connection remains unverified until the owner connects their app.

## Data and permissions

Use an official bot account. Only the Guilds Gateway intent is enabled. The setup command checks the invoking administrator and the bot's Manage Server permission. It finds only its own named synthetic rule; it does not log or export other rules. No unsolicited direct messages, public accusations, persistent visitor identifiers, request dumps, or API-data research collection are implemented.

## Sources

- [Discord interactions](https://docs.discord.com/developers/interactions/receiving-and-responding)
- [Discord AutoMod](https://docs.discord.com/developers/resources/auto-moderation)
- [Discord Gateway](https://docs.discord.com/developers/events/gateway)
- [discord.js](https://discord.js.org/docs/packages/discord.js/main)
