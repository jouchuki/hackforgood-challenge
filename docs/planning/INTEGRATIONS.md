# Integration delivery plan

This plan covers the installable browser package, WordPress plugin, locally hosted Discord bot, integration catalogue, and privacy-preserving delivery boundary. Implementation follows the master plan's canonical routes, contracts, and ownership assignments.

## Delivery status and scope

| Deliverable | Required implementation | Evidence before claiming support |
|---|---|---|
| JavaScript embed | Built standalone script, published configuration, explicit submission binding, full-page handover | Two origins, two different websites, production build, real demo counter updates |
| WordPress | Installable ZIP, settings, core search-form adapter, demo shortcode | Activation and submission flow in a real local WordPress runtime |
| Discord | Runnable bot, shared native interaction handlers, offline simulator, setup guide | Handler tests, live TEST connection and regular-member exact-phrase blocking; installation completed from the dashboard |
| Framework recipes | Local package and specific browser lifecycle examples | Label each recipe tested or documented; a recipe is not an independently maintained SDK |
| Other platforms | Branded catalogue and platform-specific documentation | No installed, connected, or tested status without corresponding evidence |

The current embed imports source modules and resolves a relative intervention URL. The existing WordPress file only enqueues a widget and exposes settings. The Discourse example includes typing hooks and unverified event names. These are starter material, not completed integrations. Remove typing-based examples from the final submission-focused guidance; do not copy unverified hooks as tested APIs.

## Browser package

Serve the stable artifact at `/embed/before.js` through the owned gateway on port 3000. Produce a standalone IIFE without unresolved imports, `import.meta.url`, runtime CDN libraries, or framework dependencies. Also provide a local npm tarball with TypeScript declarations; do not document a published npm package that does not exist.

The install snippet contains `src`, a public `data-site` installation ID, and an optional explicit `data-endpoint`. Resolve configuration, intervention, and measurement URLs from that endpoint, never the embedding page's origin. A site ID identifies configuration, not a visitor or secret. The script remains useful when the host page runs on a different origin.

Expose an idempotent `window.Before` API for initialization, explicit form binding, triggering, and disposal. Retain `sbis:trigger` compatibility. Register the event listener before asynchronous configuration loading; queue metadata-only triggers until initialization finishes. A repeated script inclusion must not duplicate listeners or redirects.

Submission bindings inspect only configured forms or platform hooks. The synthetic matcher remains the repository's fake `test-trigger-*` list. No general DOM scraping, keystroke capture, network monkeypatching, or production classifier is included. Non-matching submissions continue normally. A synthetic match cancels that submission and navigates once to `/intervention/:siteId`.

Forward only validated interaction metadata. Do not put original inputs, full source URLs, Discord IDs, or persistent visitor IDs into URLs, telemetry, browser storage, or logs. Resolve return destinations from installation configuration and an origin/path allowlist; never implement an arbitrary open redirect.

Public configuration must expose only published content and permitted study configuration. Drafts, administrator credentials, and researcher controls stay behind their separate API namespaces. Pin a published revision to an intervention exposure so editing does not change a journey halfway through.

### Browser acceptance

- Serve a host page on port 3004 and load the same built script served from port 3000; this must not depend on Vite source resolution.
- Publish text in the moderator workspace and observe it on both demo websites without editing either site's source.
- Validate a normal submission, an exact fake match, repeated submission, late-loaded configuration, and duplicate installation.
- Test relative paths, hash navigation, React-style rerenders, direct page reload, and disposal without retaining text.
- Apply explicit public-origin allowlists. Credential-free public requests use no visitor cookies; administrator cookies never accompany cross-origin embed requests.
- Document `script-src`, `connect-src`, and any required style/font policy. Test a restrictive CSP; do not silently require `unsafe-eval` or external CDNs.
- Keep the full-page handover top-level. Do not depend on cross-origin iframe access or globally weaken framing policy.

## WordPress plugin

Extend `integrations/wordpress-plugin/` into a ZIP with a valid plugin root, version, readme, and bundled adapter assets. Settings require `manage_options`, nonce protection, escaped output, and validated URL/site/country fields. A loopback HTTP endpoint is allowed for the local demo; deployment guidance requires an appropriate HTTPS endpoint.

Support the core site-search form and an explicit `[before_demo]` shortcode. Other forms require explicit bindings. Do not claim all bbPress, BuddyPress, page-builder, or theme submissions are covered merely because the plugin activates. The plugin loads the browser package and passes installation configuration; it does not implement a new detector.

Use WordPress Playground CLI with pinned versions and a committed local blueprint. The environment has Node but no PHP binary, and Docker's daemon is unavailable. Playground supplies the local WordPress/PHP runtime and supports plugin mounting. Prepare the runtime during setup, before the pitch; after setup the demonstration must not require a new download. The official CLI documentation describes mounting and persistence. [WordPress Playground CLI](https://developer.wordpress.org/playground/developers/local-development/wp-playground-cli/)

Acceptance: install the ZIP in local WordPress on port 9400, activate, save configuration, open a frontend core search form, submit the synthetic example, reach the published intervention, and see aggregate demo outcomes. Verify deactivation removes injection and direct page reload remains functional. Record tested WordPress/PHP versions rather than implying universal compatibility.

## Discord bot and simulator

Implement a locally running Gateway bot so it can receive interactions over an outbound connection without requiring a public interaction webhook. Discord remains an external service requiring network access and a developer application; local hosting does not make Discord offline. [Gateway documentation](https://docs.discord.com/developers/events/gateway)

Provide an environment template containing variable names only: application ID, bot token, optional test guild ID, and configured public application origin. Never put credentials in frontend assets, generated installation snippets, logs, or the repository. Missing credentials produce a clear disconnected status and leave the offline simulator available.

Use shared pure handlers for the real bot and `/demo/discord`. The simulator must execute those handlers rather than display canned screenshots. Demonstrate setup, a synthetic intervention command, language selection, support buttons, and per-exposure variant selection. Do not read ordinary channel contents by default or request privileged Message Content access for these interactions.

AutoMod setup is an explicit administrator action using synthetic rules only. AutoMod may block publication and display a short explanation, but cannot force a browser redirect. The custom explanation is limited to 150 characters. Rich ephemeral replies require a command or component interaction; they are not arbitrary invisible replies to ordinary messages. [AutoMod](https://docs.discord.com/developers/resources/auto-moderation), [interaction replies](https://docs.discord.com/developers/interactions/receiving-and-responding)

Bot output must not publicly accuse a member, automatically DM them, or forward matched content to a moderator channel. Ephemeral visibility does not mean anonymity from Discord. Resource links contain no Discord user, channel, or guild identifiers.

Loopback URLs work only for the presenter on the same machine. Keep native support options available and label local-only web handovers. A later remote trial requires an explicitly configured reachable HTTPS origin. Do not silently deploy or create a public tunnel.

Acceptance without credentials: startup diagnostics, shared-handler unit tests, simulated interactions, safe links, translated replies, missing-permission errors, and no secret/identifier leakage. Deliver command-registration instructions and bot source; mark real OAuth installation/Gateway validation as pending connection. No fake connected state.

## Catalogue and framework documentation

The moderator catalogue links to `/moderator/docs/:slug`. Each entry includes a local brand icon, supported action surface, installation method, requirements, copied example, uninstall instructions, known boundaries, and status.

Include WordPress, Discord, Discourse, NodeBB, Flarum, phpBB, XenForo, Invision Community, Drupal, and Joomla; include HTML/JavaScript, React, Next.js, Vue, Nuxt, Svelte/SvelteKit, Astro, Express, Django, Rails, and Laravel as framework/server recipes. Do not imply an SDK exists when an entry is documentation for the shared script. Server-only examples supply a trigger or handover response; browser code renders the intervention.

Use the master plan's four statuses: **Tested**, **Package ready; connection pending**, **Recipe**, and **Planned**. The current Discord package is Tested after live connection, command registration and regular-member blocking verification. A simulator alone does not establish a live connection. Test the JS package and React wrapper; label Next-specific and other framework guidance as recipes unless independently exercised. Native forum adapters remain documented/planned until independently exercised. Installation-time claims require a timed test, and no combined market-share claim is made without a defined denominator and credible evidence. Framework and CMS market shares overlap and cannot be added.

Download favicons or permitted logos from official provider assets at build/design time. Store files locally with source URL, retrieval date, applicable licence/brand guidance, and alt text. Keep fallback monograms for failed/missing assets. Do not use Google favicon endpoints, remote icon CDNs, or runtime requests to providers from an intervention. Catalogue branding does not imply endorsement.

## Owned proxy and country hint

The owned gateway on port 3000 is the only public entry point. The app API listens privately on port 3001; Vite on private port 3002 is development-only. Resolve the source address transiently against a locally hosted, attributed IP-country database, then pass only a two-letter country hint to the app. Local/private addresses, missing data, and ambiguous results yield unknown or a clearly labelled demo override.

Remove incoming and forwarded IP headers, including `Forwarded`, `X-Forwarded-For`, `X-Real-IP`, `CF-Connecting-IP`, and `True-Client-IP`, plus `Referer`. Discard caller-supplied country/internal gateway headers before injecting the trusted hint and infrastructure credential. The private app rejects requests without that credential, including direct calls from the same-machine browser. Do not enable proxy-protocol source-IP forwarding. Public embed config/metrics fetches omit credentials and set no-referrer policy.

Disable IP/request logging at the gateway, app, error handlers, and any hosted infrastructure. Do not serialize request objects in exceptions. The gateway necessarily sees the connection address in memory; promise no retention, not that the address is never received. No third-party lookup request is made per visitor.

Acceptance: injected IPv4/IPv6 request cases, spoofed headers, unknown/private addresses, redacted errors, and a captured downstream request showing country only. Country remains approximate; a visitor correction overrides it. Country data is not a determination of applicable law. The proxy is a privacy boundary, not a general anonymous relay.

## Tor compatibility

Provide an ordinary usable intervention in Tor Browser Standard mode, local assets, and a server-rendered `/help` page usable without JavaScript. Add a server-side redirect recipe for a platform that must interrupt submissions when JavaScript is disabled. A browser-only snippet cannot intercept with JavaScript disabled. Tor's stronger security levels disable some scripts and media. [Tor Browser security levels](https://support.torproject.org/tor-browser/features/security-levels/)

Do not attempt to discover a Tor visitor's real IP, fingerprint Tor usage, or infer their country from an exit relay. An onion deployment sets country to unknown and offers manual selection. Include an optional onion-service configuration recipe pointing only to the public intervention/help service, never moderator or researcher routes. Actual onion publication and Tor installation are outside this local delivery. [Tor onion-service setup](https://community.torproject.org/onion-services/setup/)

Test JavaScript-disabled help access, keyboard navigation, ordinary fonts when webfonts are unavailable, and explicit external-service links. Do not claim a Tor Browser or onion end-to-end test unless actually performed; distinguish an installed-browser test from generic no-JavaScript verification.
