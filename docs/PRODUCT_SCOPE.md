# Next Step product scope and execution plan

## Product

Next Step is a self-hosted prevention package for small platforms. A moderator installs a browser script, WordPress plugin, or Discord bot, chooses a default intervention, and manages their default message. A supported synthetic submission opens a full-page journey: supportive reflection, education, and a direct route to existing professional help. Researchers use a separate workspace to author and compare interventions using aggregate outcomes from participating platforms. In this bounded local-owner demonstration, explicit platform participation is also managed there; published versions never replace approved versions automatically.

The hackathon deliverable is a complete local demonstration with runnable integrations and reproducible installation packages. It is not a live research deployment or a claim of demonstrated prevention effectiveness. The core works without commercial services, model keys, or third-party analytics.

## Decisions agreed with the product owner

| Decision | Scope |
|---|---|
| Working integrations | Browser embed and JavaScript SDK, locally hosted Discord bot, installable WordPress plugin |
| Discord connection | Real official bot connected to TEST; application-managed installation and protection verification, with owner credentials configured once |
| Other platforms | Branded installation catalogue and platform-specific documentation, with explicit implementation status |
| Languages | Dutch and English complete; other languages are explicitly labelled previews |
| Research participation | Explicit platform-owner approval for each published study revision, operated from the researcher workspace in this local demo |
| Detection | Existing synthetic matcher for demos; production detection supplied externally |
| Visitor journey | Redirect to a dedicated full page; reflection first by default, with immediate access to help and exit |
| Location | Owned proxy may use the connection IP transiently for country lookup; no IP retention or logging; downstream app receives only a country hint |
| Privacy | No visitor identifiers, persistent visitor cookies, fingerprinting, profiles, raw input collection, or activity histories |
| Execution environment | Local, self-hosted services and locally bundled assets; no public deployment is required |
| Current stage | Technical prototype implemented; local Discord installation flow complete |

The product name is Next Step. Its visual direction is warm ivory and forest green, with locally served Newsreader and DM Sans. [DESIGN.md](../DESIGN.md) remains the visual contract.

## Separate product surfaces

Separate routes have separate page layouts and role-scoped APIs. A hidden navigation item is not role separation. A local role chooser can demonstrate seeded moderator and researcher accounts without claiming production identity management. Neither role can access original submissions or visitor records because those records do not exist.

| Surface | Routes | Required behaviour |
|---|---|---|
| Local launchpad | `/` | Choose moderator workspace, researcher workspace, or guided demo; report service readiness |
| Moderator overview | `/moderator/overview` | Installation health, active intervention revision, enrolment status, installation verification status |
| Moderator message editor | `/moderator/intervention` | Edit both language versions, preview all stages, include reviewed legal block, save draft, publish, revert |
| Integration catalogue | `/moderator/integrations` | Search/filter branded cards, accurate status, working downloads and documentation links |
| Installation documentation | `/moderator/docs/:slug` | Platform prerequisites, connection settings, exact installation steps, code copying, supported submission surfaces, test instructions and uninstall |
| Researcher platforms | `/researcher/studies/:id/platforms` | Explicitly review and enable a published revision on an owned test platform, or withdraw it. No automatic enrolment. |
| Moderator country content | `/moderator/content` | Country and language matrix, sources, review status, fallback behaviour and content-pack version |
| Researcher studies | `/researcher/studies` | Study list, draft/published/paused states, duplicate or create study |
| Researcher composer | `/researcher/studies/:id/editor` | No-code message and scene composition, bilingual variants, tone/order/motion controls and preview with automatic even assignment |
| Researcher outcomes | `/researcher/studies/:id/results` | Aggregate comparison restricted to participating platforms/study revision; export safe summaries |
| Visitor intervention | `/intervention/:siteId` | Public journey with no portal chrome, login, user identifier, or original submission in the URL |
| Low-script support | `/help` | Server-rendered country/language choices, harm/legal information where reviewed, and functional help links without JavaScript |
| Demonstration | `/demo/forum`, `/demo/fieldnotes`, `/demo/discord`, `/demo/control` | Synthetic submission examples, shared bot-handler simulator, deterministic scenario and reset controls |

The final navigation, labels, URLs, loading/empty/error states, keyboard focus, mobile behaviour, and reduced-motion behaviour must be verified in a browser. Draft previews do not emit measurement signals.

The three runnable integration guides contain a **Connect this platform** panel: configure endpoint, allowed host origins, safe return URL and default country → save installation → copy snippet/download plugin settings → run synthetic check → show installation health. Start with seeded sites; no separate site-management product is required.

The launchpad establishes a seeded demo role session. Moderator and researcher sessions use separate role-scoped administration cookies and can coexist across tabs; public fetches omit credentials. Separate browser contexts verify that a researcher-only session cannot mutate moderator data and vice versa. These necessary administration sessions do not identify visitors and are not production authentication.

Detailed view acceptance: [Research and UX](planning/RESEARCH_AND_UX.md).

## Fast installation and integration breadth

### Implement and exercise

1. **Browser embed:** a built, stable `/embed/before.js` classic-script bundle with no Vite, source-module, or import-map dependency. Configuration identifies the platform, not a visitor. A second-origin fixture proves that copied installation instructions work outside our app's origin.
2. **JavaScript SDK:** the same core packaged as an npm tarball, with type definitions and a documented lifecycle. Provide a tested React wrapper; distinguish that wrapper from framework-specific documentation recipes.
3. **WordPress:** downloadable plugin ZIP with an admin settings page, safe script loading, core search integration, and an explicit synthetic demo form/shortcode. Activation, configuration, synthetic interception, normal search and deactivation must be tested in actual local WordPress.
4. **Discord:** a locally running official bot with shared command/interaction handlers, setup validation, and a simulator that uses those same handlers. Synthetic AutoMod configuration can show the short interruption; commands/buttons provide native support or link to the web journey. Discord cannot force arbitrary browser redirects or observe native searches. The live test-server connection and exact-phrase blocking have been verified; complete live help-link and language-button interaction remains a separate check.

The primary installation target is the shortest reproducible path from a prepared running service to the first synthetic intervention. Record actual setup steps and measured time during verification; do not invent an installation-time claim.

### Document and showcase

The catalogue contains about twenty useful entries, grouped by delivery mechanism rather than inflating a support count:

- Tested implementation/package entries: generic browser JavaScript, React wrapper, WordPress, Discord.
- Framework recipes using the same browser package: Next.js, Vue, Nuxt, SvelteKit, Astro, Angular, Express/Node, Django, Laravel, Rails, and Drupal.
- Native adapter roadmaps: Discourse, NodeBB, Flarum, phpBB, XenForo, and Invision Community.
- Compatibility entry: Tor Browser and low-script/onion deployment.

Each entry has a local official favicon/logo where obtainable, a source/provenance record, a reliable fallback monogram, a status, prerequisites, supported actions, and a useful documentation page. The visitor-facing product never fetches favicons from Google, icon services, or platform domains. Download assets during development and serve them locally.

Use the labels **Tested**, **Package ready; connection pending**, **Recipe**, and **Planned** only where supported by the verification record. A button for an unimplemented adapter opens its guide or roadmap; it does not fake installation.

The pitch can state the number of packages actually tested and recipes documented. It cannot claim support for 90% of the internet, or sum overlapping framework market shares, without an independently supported coverage analysis. The product demonstrates a broadly reusable web-standard integration instead.

Detailed delivery and platform constraints: [Integrations](planning/INTEGRATIONS.md).

## Intervention and research scope

The default supportive opening refers to agency, relationships and future choices. It makes no claim to know the visitor's state and is not presented as an established technique for reducing arousal. It is followed by education and optional reviewed legal information, then a handover to the challenge's help resources. Help remains reachable from the first screen; exit is never gated by a timer or animation.

A matched web demo submission is cancelled before publication and redirects. Leaving the intervention returns to a configured safe platform page, not an automatic resubmission. Original input is not persisted or included in a redirect. Native Discord behaviour is documented separately.

The researcher composer supports two to four authored variants, seeded with two, with a headline, body, buttons, tone labels, stage order, and a bounded three-scene interactive motion sequence. The allowed stage sequences are `[reflection, education, support]`, `[education, reflection, support]`, and the immediate-warning baseline `[education, support]`. Reject arbitrary/duplicate arrangements. Help and exit are outside sequencing and always available.

Two layout presets are **Reading** and **Scene**. Scene playback uses one seekable timeline, at most three scenes and 30 seconds, with none/fade/gentle-slide transitions, editable reading holds, play/pause/restart/scrub controls, and a static equivalent. Derive its poster from scene one; no asset-upload, generative poster, external video or audio pipeline is required. The same renderer powers editor preview and visitor delivery. Authenticated draft snapshots are passed directly to that renderer with `mode: "preview"`; no draft content goes into public endpoints or URLs, and preview has no collector connection.

The lifecycle is draft → validate → publish immutable revision → moderator opt-in to that revision → serve eligible synthetic exposures → aggregate outcomes → pause or withdraw. Publishing a new revision does not silently change the revision a moderator enabled. Pausing changes new assignments; an existing page can finish its snapshot.

The primary metric is selected before running the study. Default: help selection per displayed intervention exposure. Secondary metrics are stage views, explicit dismissal/exit, and coarse visible-time buckets. A help click is not receipt of treatment. Without persistent identity or longitudinal measurement, the product cannot report unique people, repeat offenders, long-term behaviour change, or person-level randomized effects.

Researchers learn from aggregate outcomes and author their own text. The portal does not generate messages from harvested submissions. Preset-based composition and examples work locally without an LLM. A future model integration would need a separately scoped data policy.

Persona labels are authoring hypotheses and synthetic scenario settings only. Behavioural profiling/categorisation remains an open future research question and is not implemented, enabled, or used for targeting.

## Languages and country packs

Dutch and English cover every visitor-facing stage, action, privacy statement and fallback, the moderator/research UI and validation, and complete JS/WordPress/Discord quickstarts. Broader technical recipes have bilingual summaries and explicitly labelled English detail. Browser preference selects a supported language; explicit choice takes precedence; unsupported languages fall back to English.

German, French, Spanish, Italian, Polish and Portuguese can appear as preview translations in the composer and catalogue. They are marked preview and do not become active visitor languages merely because a flag or dropdown exists.

Each country pack has a country code, legal blocks, help-service references, supported languages, sources, review state, last review date when actually reviewed, and version. Language availability and legal-jurisdiction coverage are separate. The Netherlands is the first jurisdiction; other EU rows can show the schema, missing review, and international fallback without invented local law or service claims.

Content-pack distribution is automatic after a maintained pack is reviewed and published. Moderators see and receive the published version without editing legal facts themselves. The demo can demonstrate a version update using a local maintained registry. It must not claim autonomous legal discovery or continuously verified law.

Default interventions resolve the current reviewed pack at new publication/exposure boundaries. Study publications pin their exact country-pack versions for reproducibility; changing study facts requires a new study revision and renewed opt-in. A revoked factual pack stops new affected study assignments and falls back to a safe current default or `/help`, rather than silently rewriting research content.

## Owned proxy and Tor

The owned entry proxy looks up country using a locally hosted country database. The connection IP is processed transiently, never stored or placed in application payloads. Use an attributed local dataset such as [DB-IP Lite](https://db-ip.com/db/download/ip-to-country-lite); database acquisition/update is a setup task, not a per-visitor external request. Cover IPv4 and IPv6; loopback, missing database and ambiguous results produce unknown country with a selector.

The proxy strips inbound IP-forwarding headers and replaces any client-supplied country header with its own trusted hint. It strips incoming `Referer` and any caller-supplied internal gateway credential. It supplies its own infrastructure credential to the loopback app; the app rejects requests without that credential. This prevents a local browser from bypassing the proxy by calling the private API port directly. The downstream app receives the proxy connection and country hint, not a forwarded visitor IP. Access, error, application, analytics and diagnostic logs must avoid visitor IPs, original URLs/query strings and request bodies. Geo lookup is approximate and never the sole basis of a legal claim.

The accurate promise is **no retained IP or individual browsing history**. The entry proxy necessarily observes a connection address while serving it. HTTPS protects transit; the local demonstration uses loopback HTTP and is not advertised as an internet deployment.

Tor compatibility means bundled assets, no external tracking requests, no fingerprinting, a working no-JavaScript help route, and optional onion-service configuration. The JavaScript embed works only when scripts are enabled; it cannot intercept submissions with JavaScript disabled. A server-integrated platform can redirect to the no-script help page. A script-only deployment cannot claim that capability.

Do not discover or monitor Tor browsing, inject into unrelated sites, install a Tor extension, or infer a Tor user's location from an exit relay. On onion deployments use unknown country and explicit selection. No public onion service is required for completion; optional configuration is not labelled as a verified live service.

## Shared implementation contracts

The contract owner freezes these definitions before parallel implementation. They supersede ambiguous starter examples, and the repository's contract documentation must be updated to match the delivered behaviour.

### Core entities

- **Site:** installation ID, moderator owner, configured origin allowlist, return URL, default intervention revision, default country, enabled locales, optional study enrolment. Site IDs identify deployments, never people.
- **Intervention revision:** immutable bilingual stage content and presentation settings, legal-block option, content-pack references and revision number.
- **Study revision:** researcher owner, hypothesis, primary metric, two to four complete variants with content snapshots and allocation weights totalling 100, eligible context, lifecycle state.
- **Enrolment:** site, specific study revision, enabled/paused state. Only its moderator changes it.
- **Aggregate bucket:** site, study revision/default intervention revision, arm, coarse day, dataset source, bounded counters and duration histogram. No event rows or visitor keys.

The existing field name `studyRevision` is a canonical publication key: `site:<siteId>@<interventionRevision>` for the site's immutable default publication, or `<studyId>@<revision>` for a study publication. The default uses `armId: "default"`; studies use their published arm IDs. Use the same keys in public config, validation, storage, reports and exports. Retain the site's historical publication eligibility so an opened exposure can report after pause/withdrawal; this is not cryptographic proof of when it began.

### Public and role APIs

| API | Purpose |
|---|---|
| `GET /api/public/sites/:siteId/config` | Published public configuration, eligible enabled study revision, variants, country/language/help references |
| `POST /api/public/sites/:siteId/metrics` | Strictly validated counter deltas; reject undeclared fields and identifiers |
| `/api/moderator/...` | Site-owned drafts/publication, settings, enrolment, aggregate results and exports |
| `/api/researcher/...` | Researcher-owned studies and variants; aggregate results only from enabled participating deployments |

Publish responses return an immutable revision and content snapshot. Draft writes never change the active visitor configuration. Ownership and role checks run server-side, including direct API requests. Public configuration exposes no draft, administrative secret, bot credential, or researcher-private record.

Freeze the following minimum role routes before feature work: moderator `GET/PUT /api/moderator/sites/:siteId`, `GET/PUT .../draft`, `POST .../publish`, `POST .../revert`, `GET/PUT .../enrolment`, `GET .../metrics`, and `GET .../export`; researcher `GET/POST /api/researcher/studies`, `GET/PUT /api/researcher/studies/:id`, `POST .../publish`, `PATCH .../status`, `GET .../metrics`, and `GET .../export`. Use read-only content/catalogue registries under the appropriate namespace. Demo seed/reset/simulation endpoints are local-presenter actions, never public collector features. A consistent JSON error shape includes a bounded error code and safe message, with no raw request dump.

### Browser interface

The stable bundle exposes `Before.init(options)`, `Before.intervene(trigger)`, and `Before.destroy()`, while retaining the starter's `sbis:trigger`/`sbis:result` bridge. Its documented bindings cover selected forms, not every input on every website. Synthetic matching is explicitly demo mode. Production mode receives an external moderation decision and does not ship real detection terms.

### Measurement

Allowed deltas: `shown`, `reflection_viewed`, `education_viewed`, `support_viewed`, `help_selected`, `engagement_measured`, `scrolled`, `education_end_viewed`, `dismissed`, `exited`, `duration_lt10`, `duration_10to30`, `duration_30to60`, `duration_gte60`. Context is a known published revision and arm, not a visitor token. Public config returns a server-issued coarse UTC `reportingDay`, shared by all exposures that day and retained in page memory. All deltas for that exposure use that day, including across midnight; validate the value against current/previous UTC day for public ingestion. Do not accept precise visitor timestamps or raw durations. A privileged deterministic simulator can populate its declared coarse demonstration window.

Assignment is per exposure and retained only in the page's memory. Local guards count shown once, each stage once, primary help selection once, and one terminal duration bucket. A reload is another exposure. There is no global exactly-once guarantee, and exit delivery is best-effort; do not add identity to manufacture one.

Minimal signals may arrive per interaction and be immediately added to counters. This is **aggregate-only storage**, not a claim that every network request is already population-aggregated. An adapter may batch deltas. Persist no individual event records. Store simulations and actual local synthetic demo actions in separate source buckets: `simulation` and `demo_interaction`. Public ingestion accepts only `demo_interaction`; the local-presenter simulator creates `simulation` buckets through the same validated aggregation core. Public config/metrics fetches use `credentials: "omit"` and `referrerPolicy: "no-referrer"`.

The dashboard and exports suppress counts below 10, rates with hidden inputs, and dependent cells that would reveal hidden values. No raw event feed, instant per-person activity timeline, arbitrary thin slices, or automatic statistical-significance badges. Preloaded data is explicitly synthetic, with documented scenario assumptions, never a fabricated finding that one intervention wins.

## Local runtime and persistence

Recommended bounded stack: retain Vite, browser JavaScript and Express; add only libraries needed for bundling, Discord, schema validation, browser tests and country lookup. The parent owns dependency changes. Avoid a framework migration during this delivery.

- Entry gateway/proxy: `127.0.0.1:3000`.
- Private application API/static server: `127.0.0.1:3001`.
- Private Vite server in development: `127.0.0.1:3002`.
- Second-origin website fixture: `127.0.0.1:3004`.
- Actual local WordPress Playground: `127.0.0.1:9400`.

Persist config, study revisions, enrolments, maintained content metadata, and aggregate counters in an ignored `.before/` directory using one application writer and atomic JSON file replacement. Do not persist visitor state. Provide explicit seed/reset commands. Restart must preserve published messages, study definitions and totals; reset must restore the rehearsed demonstration.

The locally hosted bot needs internet connectivity and Discord credentials only when a real connection is enabled. A remote Discord member cannot open the presenter's localhost URL. Native bot support remains useful; web links require an explicitly configured reachable origin. Real Discord data must not be sent to research or analytics. Credentials live in an ignored environment file, with placeholder-only examples.

### Commands and package names to implement

These are frozen execution requirements, not commands claimed to exist in the current starter. Track `package-lock.json` and update its current ignore rule during implementation; clean installation uses `npm ci`. Pin the actual tested package, WordPress/PHP/Playground, country-dataset and asset versions in the release metadata.

| Command | Contract |
|---|---|
| `npm ci` | Install the tracked dependency lock without changing it |
| `npm run demo:prepare` | Download/cache local WordPress runtime, attributed country database and required development assets; no help services or real participants contacted |
| `npm run demo:seed` | Initialise missing synthetic workspace state without overwriting an existing workspace |
| `npm run demo:reset` | Explicitly reset only generated `.before/` demo state to the documented seed |
| `npm run dev` | Start owned gateway, private API and Vite; print actual ready URLs and safe diagnostics |
| `npm run build` | Build app, stable standalone embed, SDK packages and downloadable integration artifacts |
| `npm start` | Run built application and gateway locally, without Vite |
| `npm run demo:site` | Serve the second-origin website fixture on port 3004 |
| `npm run demo:wordpress` | Start cached local WordPress Playground on port 9400 with the plugin/blueprint |
| `npm run bot` | Start the real Gateway adapter when configured; otherwise report disconnected without pretending success |
| `npm run bot:register` | Explicitly register commands in the owner's configured test guild; requires local credentials and a later intentional invocation |
| `npm run check` | Repository synthetic-trigger/data-safety checks |
| `npm test` | All domain, schema, API, role, privacy, storage and bot-handler unit/integration suites |
| `npm run test:browser` | Actual route, publish-to-render, cross-origin, keyboard, mobile, noJS and motion checks |
| `npm run test:wordpress` | Actual local WordPress activation/search/intervention/deactivation checks |
| `npm run release` | Produce manifest/archive from passing build outputs and verified submission assets |

Artifact names are `dist/embed/before.js`, `dist/downloads/before-browser.tgz`, `dist/downloads/before-react.tgz`, `dist/downloads/before-wordpress.zip`, `dist/downloads/before-discord.zip`, `release/manifest.json`, and `release/before-demo.zip`. The runtime serves the `dist/` paths without the prefix. The release includes source, tracked lock, built artifacts, guide/content assets, secret-free environment example, and submission documents; it excludes `node_modules`, `.before/`, real environment files, logs and credentials.

## Deliverables

The completion package contains:

1. Runnable local moderator workspace, separate researcher workspace, public intervention, no-script help, guided demo and installation documentation.
2. Stable built browser bundle, SDK tarball/types and tested React wrapper.
3. WordPress plugin ZIP, local Playground launcher and verified activation/search/deactivation flow.
4. Runnable Discord bot, shared-handler simulator, placeholder environment example and connection guide.
5. Local country-lookup proxy, dataset setup/attribution, header/log privacy checks and unknown-country fallback.
6. Maintained Dutch/English content, preview-language material, country-pack schema/source registry and honest review states.
7. Branded catalogue with locally bundled icons, usable recipes, accurate status and copyable code.
8. Aggregate collector/dashboard/export connected to synthetic demo interactions and reproducible scenario traffic.
9. Safety/API/browser/build verification record and representative screenshots.
10. Technical README, deterministic demo runbook, verification record, package manifest and local launch instructions. Pitch, slides and other submission prose are deferred until requested.

Submission ownership, file list, pitch timings and upload checks: [Submission plan](planning/SUBMISSION.md). Team identities, external account details and the final repository URL must come from the owner or actual repository; do not invent them. Do not claim the project is submitted to Junction until it is actually submitted.

## Preflight evidence from 7 November 2026

| Check | Result | Consequence |
|---|---|---|
| Repository safety check | Passed | Baseline passes synthetic-trigger and data-schema checks |
| Existing test suite | Two tests passed | Coverage is the safety checker only, not application correctness |
| Vite build | Passed; URL-resolution warnings emitted | Baseline compiles; packaged cross-origin embed still needs implementation and verification |
| Browser visual/functional QA | Not performed in this preflight | No claim that the current UI is polished or fully operational |
| Moderator/research separation | Shared portal navigation today | Implement separate shells/routes and API ownership |
| Message persistence | Memory-only today | Add durable local store and restart tests |
| Research routing | Fixed seeded study and fixed renderer today | Authored variants must reach the real renderer through enrolled study revisions |
| Analytics | Hardcoded display fixtures; local result events not connected | Wire actual synthetic interactions to shared aggregate storage and truthful reporting |
| Browser embed | Source module and development-relative assets today | Produce stable standalone bundle and test another origin |
| WordPress | Starter skeleton exists; no runtime test yet | Finish plugin and validate in local Playground |
| Docker/PHP | Docker CLI exists, daemon unavailable; no PHP executable | Use WordPress Playground CLI, which supports Node-based local testing |
| Discord | Owner credentials configured locally | Live TEST connection, dashboard setup and exact-phrase blocking verified |
| Tor | No Tor executable currently present | Deliver compatible fallback and configuration recipe; do not claim live onion verification |
| CodeGraph | Index is not initialized | Existing file audit used known paths; graph-based implementation exploration requires index setup |
| Submission | Templates present | Produce filled submission materials and rehearse actual demo |

The preflight changed planning documents only. The subsequent owner instruction authorises the technical build, makes A/B comparisons a release requirement, defers pitches/slides, and schedules the real Discord bot last.

## Multi-agent execution plan

Use bounded specialist agents with one explicit file owner. The environment has four concurrent slots including the coordinator: run up to three specialists at once and schedule subsequent specialists as slots free up. A large team is a sequence of focused work packages, not unrestricted simultaneous edits.

The coordinator alone owns `package.json`, build/dev configuration, root entrypoints, cross-module routing, shared contract approval and final integration. Specialists propose dependency changes to the coordinator. No specialist renames another specialist's API, imports private files across modules, or silently changes this scope.

| Package | Owner and files | Depends on | Done when |
|---|---|---|---|
| A | Contract specialist: `core/contracts/`, shared entity/assignment/measurement definitions | This plan | Schemas, lifecycle and examples frozen; validation fixtures pass |
| B | Asset/content specialist: `content/`, local brand assets and provenance | This plan | Complete NL/EN, preview status, sourced country registry and icons bundled |
| C | Submission specialist: pitch/runbook/one-pager drafts under `submission/` | This plan | Documents reflect bounded scope; completion claims wait for verification |
| D | API/storage specialist: private application routes/store | A | Role ownership, versioned publish/enrolment, durable state, aggregate API tests |
| E | Gateway/privacy specialist: `gateway/`, local country lookup/setup | A | IP headers/logs stripped; country-only downstream path and unknown fallback tested |
| F | Embed/SDK specialist: `packages/browser/`, `packages/react/`, fixture scripts | A | Stable bundle/tarball and second-origin lifecycle tests pass |
| G | Moderator UI specialist: `app/moderator/` | A, D, shared design tokens | Editor, installation/docs, enrolment, analytics and country views work |
| H | Researcher UI specialist: `app/researcher/` | A, D | Author/preview/publish/pause flows work against real stored study variants |
| I | Visitor/motion specialist: `app/intervention/`, server-rendered help templates | A, B, D | All authored content/order/motion reaches visitor; language/help/accessibility checks pass |
| J | WordPress specialist: plugin files, ZIP and Playground fixtures | D, F | Real WordPress installation and normal/synthetic submission flows pass |
| K | Discord specialist: bot and simulator files | A, D | Shared handlers, setup diagnostics, native interactions and offline tests pass |
| L | Verification specialist: isolated API/browser/packaging tests and evidence | Integrated product | Acceptance matrix passes; recorded limitations match catalogue status |
| M | Design-polish specialist: targeted UI fixes coordinated with owners | Integrated views | Open Design craft review, desktop/mobile/keyboard/reduced-motion checks pass |
| N | Independent release reviewer: reports only, no shared implementation edits | L, M | Submission, claims, privacy and package contents cross-checked |

Suggested waves: A/B/C; then D/E/F; then G/H/I; then J/K plus independent integration testing; then L/M/N. Implement the real Discord package K after the other technical work, as requested. Keep specialists on an existing assignment until their acceptance checks are complete. The coordinator integrates continuously between waves and resolves mismatches without asking the owner about routine engineering choices.

Acceptance is based on behaviour, not agent self-reports. When a defect appears, give its owner a precise reproduction and recheck the affected boundary. Do not create decorative features or broaden adapters while required flows remain broken.

## Execution order and release gates

1. Freeze contracts, canonical routes, data ownership and status vocabulary. Resolve the starter's individual-result versus aggregate-endpoint mismatch in documentation and code.
2. Build persistence/API/privacy gateway and the standalone package. Prove one synthetic submission can load published configuration through another origin.
3. Separate moderator/research/visitor views. Connect real authoring, opt-in, assignment and counters before adding richer presentation.
4. Complete WordPress and Discord deliverables. Add catalogue/recipes/icons and all language/content status views.
5. Add bounded motion composition and its static alternatives. Verify representative frames and continuous playback; an attractive preview alone is insufficient.
6. Run safety checks, meaningful schema/API/storage tests, cross-origin embed tests, actual WordPress test, Discord simulator tests and browser journey tests. Confirm no visitor payloads or IPs appear in persisted files/logs.
7. Verify a publish → researcher study → moderator opt-in → synthetic submission → correct authored variant → help selection → aggregate report flow. Generate enough labelled synthetic traffic for reportable counts while keeping low counts hidden.
8. Rehearse the three-minute pitch from a clean seed and after a restart. Verify every download, copied snippet, guide link, icon and export. Capture fallback evidence, complete the submission package and leave the local demo running with exact URLs and commands.

Perform one network-disabled rehearsal after preparation while preserving loopback connectivity: both workspaces, JS demos, cached WordPress, Discord simulator, deck, icons, translations and unknown-country fallback must work. The real Discord adapter reports disconnected and never blocks the rest of the app. Genuine external help links are shown without requiring the external service to load; no real calls, chats or submissions are made.

Do not report completion while required tests fail or a core workflow is mocked behind a functional-looking control. Deliberately non-working catalogue entries remain polished, useful documentation with honest status.

## Sources and supporting plans

- [Challenge brief](../BRIEF.md), [safety rules](../SAFETY.md), [plug-in contract](../contract/PLUGIN_CONTRACT.md), [pitch guide](../submission/PITCH_GUIDE.md).
- [Integration delivery plan](planning/INTEGRATIONS.md).
- [Research and UX specification](planning/RESEARCH_AND_UX.md).
- [Architecture and acceptance plan](planning/ARCHITECTURE_AND_ACCEPTANCE.md).
- [Submission plan](planning/SUBMISSION.md).
- [Open Design](https://github.com/nexu-io/open-design), revision `87a4f91c308170a8270458fc40fc66a86ed69aac`: frontend-design, impeccable-design-polish, ui-animation and craft state/accessibility/motion guidance. Plan-stage use does not launch the Open Design app or add its telemetry to the runtime.
- [Discord AutoMod](https://docs.discord.com/developers/resources/auto-moderation), [interactions](https://docs.discord.com/developers/interactions/receiving-and-responding), [Gateway](https://docs.discord.com/developers/events/gateway).
- [WordPress Playground CLI](https://developer.wordpress.org/playground/developers/local-development/wp-playground-cli/).
- [Tor security levels](https://support.torproject.org/tor-browser/features/security-levels/), [Tor safe use](https://support.torproject.org/tor-browser/security/using-tb-safely/), [onion-service setup](https://community.torproject.org/onion-services/setup/).

## Current role and preset boundaries

Moderators manage installation, their published default message, and country content. No research navigation, analytics widgets, aggregate report requests or CSV exports run in moderator views. Legacy analytics and research page URLs redirect to the moderator overview; moderator analytics APIs return 404. Researcher pages own studies, explicit local platform participation and all aggregate analytics.

Study setup has no allocation controls. New comparisons use an automatic even split, rebalanced when variants are added or removed. Previously published versions keep their saved settings until an explicitly approved replacement. Message presets change complete bilingual copy for the actual initial stage. Study creation supports paired templates and a three-experience comparison.

The three experience layouts are a plain single-page legal document with inline support, Pause and reset with immediate practical prompts, and Life direction with direct questions about time and values in an ink-and-amber design. Local legal and enforcement facts appear only with a reviewed matching jurisdiction; general authored wording does not claim that the current visitor is identified, tracked or reported.
