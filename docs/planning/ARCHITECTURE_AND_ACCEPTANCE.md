# Architecture and acceptance plan

The local demo must connect installation, authored interventions, opted-in research, and truthful aggregate reporting. This supporting plan adopts the master route/API map; the master plan governs any later naming changes. Planning only: no application code is changed here.

## Current audit

| Existing component | Gap to close |
|---|---|
| `app/portal.js` | Moderator/researcher share one hash shell; no actual role boundary |
| `starter-backend/demo.js` | Config/studies live in memory; no platform ownership or persistence |
| Custom studies | Store metadata but no authored variants; custom outcomes are disconnected |
| `app/intervention.js` | Resolves only fixed `reflection-first`; results remain local DOM events |
| `app/shared.js` | Hardcodes a B advantage and duration distribution independently of actual actions |
| `embed/snippet.js` | Source-relative module/redirect, no stable cross-origin distribution |
| `/api/metrics` | Accepts individual result objects despite the aggregate prose contract; permissive validation |
| Current tests | Cover the safety scanner, not new application workflows |

Root preflight on 7 November 2026 passed the safety check, two existing tests, and Vite build. Build warned about runtime-relative URLs. No browser QA has been completed. These are baseline checks, not product acceptance.

## Runtime and persistence

```text
Owned gateway :3000 -> private app/API :3001
                    -> internal Vite :3002 in development
Second-origin embed test host :3004
Local WordPress Playground :9400
Discord Gateway client -> shared local app adapters
```

Gateway-only exposure: transient country lookup against a local MMDB, no request/IP logging, strip inbound source-IP forwarding headers and Referer, forward only a trusted country code. App connections originate at the proxy. Strip caller-supplied internal gateway credentials and inject the owned infrastructure credential; private app requests without it fail. Disable IP-bearing logs/error dumps across gateway, app, process manager, and any hosting layer. Unknown/Tor country remains selectable. No third-party geolocation call or browser IP discovery.

Use atomic JSON persistence in ignored `.before/`, with one writer queue, schema validation on startup, temporary-file replacement, and preservation of the last valid store after a failed write. Restart preserves settings, publications, studies, enrollments, country packs, and aggregates. Explicit reset/seed controls replace automatic startup resets.

Persist no visitor IDs, exposure IDs, input text, IP/prefixes, user agents, referrers, precise event timestamps, full URLs, or individual events. Discord installation configuration may contain a guild ID; analytics never contain member IDs or message content. Public installation IDs identify platforms, not visitors.

Local demo sessions enforce moderator/researcher ownership on administrative APIs. Use distinct role-scoped administration cookies so moderator and researcher tabs can coexist; test permissions in separate browser contexts. Separate shells alone are insufficient. Document seeded demo login honestly; enterprise authentication is outside scope. Visitor pages require neither login nor tracking cookies.

## Canonical routes and proposed contracts

| Surface | Routes |
|---|---|
| Moderator | `/moderator/{overview,intervention,analytics,integrations,research,content}` |
| Installation docs | `/moderator/docs/:slug` |
| Researcher | `/researcher/studies`, `/researcher/studies/:id/{editor,results}` |
| Public | `/intervention/:siteId`, `/help` server-rendered without JavaScript |
| Demo control | `/demo/{forum,fieldnotes,discord,control}` |
| Distributions | `/embed/before.js`, `/downloads/*.zip` |

Shared contracts have one owner; feature agents consume them. API namespaces are `/api/public`, `/api/moderator`, `/api/researcher`. The frozen public endpoints are `GET /api/public/sites/:siteId/config` and `POST /api/public/sites/:siteId/metrics`. Define the role endpoints before parallel implementation:

- Public config: immutable revision snapshots with active enrollment/arms, locale packs, and help registry. Return no draft/administrative information. Metrics accept only the frozen known-site counter contract below.
- Moderator: owned site/settings, EN/NL draft, publish, study enrollment, suppressed metrics/export.
- Researcher: owned study CRUD, variant drafts, publish, pause, scoped suppressed results/export.
- Presenter: synthetic seed/reset controls, restricted to local demo control.

Essential records: site with approved origins/defaults; editable draft; immutable message publication; study with hypothesis/primary metric/two to four variants/allocation; immutable study publication; explicit moderator enrollment; aggregate bucket with bounded dimensions.

Bound the demo to two to four variants per study, seeded with two, positive integer weights totalling 100%, and one active enrolled study per site. Publishing freezes content, allocation and country-pack versions. Editing creates a new revision; active exposures retain their in-memory snapshot. Pausing/unenrolling returns subsequent exposures to the moderator default. Accept late deltas for historically eligible site/publication/arm references. Researcher publication does not enroll sites. A revoked factual pack stops affected new study assignments; it does not silently rewrite published study content.

The `studyRevision` field is a publication key: `site:<siteId>@<interventionRevision>` with `armId: "default"`, or `<studyId>@<revision>` with a published arm ID. Use it consistently in config, collector, storage and reports.

Use strict unknown-field rejection, bounded enums/counts/string lengths/request size, known publication/site references, and safe object maps. Never execute arbitrary researcher HTML/JS. Keep admin secrets out of snippets. CORS permits registered origins on public config/collector routes; it must not grant public administration access. Redirect destinations are allowlisted.

## Measurement semantics

One exposure starts after the first stage successfully renders while visible. Assignment happens once per exposure, in page memory. Reload starts a new exposure. Do not claim unique people, persistent assignment, or longitudinal research.

| Counter | Rule per exposure |
|---|---|
| `shown` | Once on first successful visible render |
| Stage views | Once per reflection/education/support stage, even when revisited |
| `help_selected` | Once on first external help selection; never “received treatment” |
| `dismissed` | Once on an explicit dismiss action before a help selection |
| `exited` | Once on an explicit leave action before a help selection; do not also count dismissal |
| Duration bucket | One finalized visible-time bucket when an observable terminal action occurs |

Pause visible-time accumulation when hidden. Send only buckets: under 10s, 10–30s, 30–60s, over 60s. Tab close/abandonment is not reliably observable; missing durations are not zero. Show a recorded-duration denominator. Preview mode emits no research counters. Forced-variant presentation runs remain explicitly synthetic/preview.

The site is selected by the metrics URL. A strict counter payload carries only the agreed schema version, `studyRevision`, `armId`, `reportingDay`, `source`, and allowlisted count deltas. Public config issues a shared coarse UTC reporting day; retain it for the exposure across midnight and validate it against current/previous UTC day. Sources are exactly `demo_interaction` and `simulation`, retained through storage and export; public ingestion permits only the former, while the privileged simulator uses the same aggregation core. The only allowed delta fields are `shown`, `reflection_viewed`, `education_viewed`, `support_viewed`, `help_selected`, `dismissed`, `exited`, `duration_lt10`, `duration_10to30`, `duration_30to60`, `duration_gte60`. No raw query, visitor key, browser URL, exact timestamp, raw duration, or extra properties are accepted. Public fetches omit cookies and the Referer header.

A delta of one may represent one interaction: describe this as **minimal outcome signals with aggregate-only storage**, not aggregation across visitors before transmission. Validate, increment counters, discard body. Never append request/event logs. Platform backends may send pre-batched deltas through the same schema; a browser cannot aggregate across visitors.

In-memory flags prevent duplicate shown/help within the exposure. Without stable exposure IDs, server-wide exactly-once delivery is impossible. Do not blindly retry potentially accepted counter POSTs; measurement failure must not block help. Publish this limitation rather than adding tracking identifiers.

`AggregateBucket` has exactly the bounded key `siteId / studyRevision / armId / day / source`; day is the coarse server-issued exposure reporting day. Avoid additional locale/IP/persona dimensions or tiny arbitrary cohort combinations. Personas label authored hypotheses/synthetic scenarios, never inferred visitors.

Suppress every count below 10 in API, UI, charts, and CSV. Hidden is `null`, not zero. Rates require reportable numerator and denominator. Withhold complementary totals/breakdowns that reveal hidden cells by subtraction. No individual live activity feed; threshold suppression is not a universal anonymity guarantee.

Help rate = help selections / shown; completion rate = support viewed / shown. Duration distributions use recorded duration buckets. Never show statistical significance, proven winner, reduced arousal, treatment uptake, or prevented abuse from demo counters.

## Synthetic traffic

Remove fixed inferred rates in `syntheticSummary()`. Provide a labelled seeded scenario with explicit volume, allocation, and assumed outcome parameters. The seed identifies a simulation, never a visitor. No default assumption that reflection wins.

Both actual local synthetic interactions and generated scenarios use the same publication resolver, allocation/counter rules, strict collector, persistence, suppression, and reporting API. Keep sources separable. Browser tests prove actual rendering; the batch generator need not render thousands of pages.

New custom studies render their own copy and begin empty. Single manual exposures remain hidden below threshold. Generate a reportable batch to demonstrate aggregate changes, rather than fabricating a frontend chart or bypassing suppression. A deterministic empty/reset state must also work.

## Execution dependencies

1. Freeze schemas/routes/publication/enrollment/embed API with one contracts owner.
2. Implement pure validators, resolver, allocation, counters, suppression, persistence; test domains.
3. Implement role-scoped APIs and restart tests.
4. Parallelise isolated moderator, researcher, renderer, integration, content, and asset modules against contracts.
5. Connect authored publications/enrollment to runtime, and real synthetic counters to reports.
6. Package cross-origin embed, WordPress ZIP, Discord bot/simulator; test built artifacts.
7. Seed/reset/run the scripted demo, perform browser QA, finish handover artifacts.

Agents must not independently rewrite shared schemas, main router, build configuration, or package manifest. The integration owner reconciles changes and runs final checks.

## Acceptance checklist

| ID | Observable pass condition |
|---|---|
| A01 | Separate role routes/shells; direct inappropriate mutations return 403 |
| A02 | Publish EN/NL text; a fresh embed exposure displays that exact publication |
| A03 | Restart preserves site settings, publications, study, enrollment, aggregates |
| A04 | Normal submit follows host behaviour; synthetic match redirects; no original text in payload/URL |
| A05 | Built embed works from second origin with correct assets/config/redirect |
| A06 | Custom two-variant study genuinely renders authored content only after moderator opt-in |
| A07 | Pause/opt-out affects future allocations without breaking current exposure |
| A08 | Preview emits no counters; stage revisits/repeated clicks do not inflate primary counts |
| A09 | Hidden intervals excluded; observable completion creates one duration bucket |
| A10 | Counts 0, 1, 9 hidden; 10/11 reportable; rates/complements/CSV do not leak hidden values |
| A11 | Collector rejects negative/fractional/huge counts, unknown fields/references, unsafe keys |
| A12 | Store/log/payload sentinel inspection finds no original input, identity, IP, or raw events |
| A13 | Country correction changes routing; unknown country has explicit safe fallback |
| A14 | Complete EN/NL keys/actions; other languages visibly preview-only |
| A15 | WordPress ZIP installs/activates in real local Playground and invokes shared intervention |
| A16 | Simulator invokes actual bot handlers; missing credentials actionable; no false live status |
| A17 | Bot adapter tests pass; real-guild connection explicitly awaits user setup |
| A18 | Motion preview/pause/replay, reduced motion, immediate help/exit work |
| A19 | `/help` works JS-disabled; no claim of JS-disabled interception from browser-only snippet |
| A20 | Catalogue statuses/docs/copy/downloads and bundled favicons work without runtime asset vendors |
| A21 | Desktop/mobile/keyboard/long Dutch copy/loading/empty/error views remain usable |
| A22 | Clean install, build, start, reset, seed, shutdown reproduce documented local product |
| A23 | Network-disabled rehearsal preserves loopback: cached WordPress, both workspaces, JS demos, simulator and deck work; bot reports disconnected |
| A24 | Historical publication accepts late help after withdrawal; midnight-spanning exposure retains its issued reporting day |
| A25 | Direct app-port request without gateway credential fails; forged source/country headers and Referer do not reach app |

Use Node's test runner for domain/HTTP tests and browser automation for actual flows, requests, accessibility interactions, downloads, and screenshots. Extend `npm test` to include new suites. Keep `npm run check` mandatory. Save exact command results and unverified limitations; source inspection alone is not browser evidence.

## Handover artifacts

Deliver updated README; stable script/module build and SDK recipes; installable WordPress ZIP; Discord bot, `.env.example` without secrets and simulator; moderator/researcher docs; country-pack schema/review guide; filled one-page rationale and safe test plan; three-minute pitch script and concise deck; deterministic demo runbook; actual demo recording/screenshots; verification report; asset/Open Design/font/geo attribution inventory.

Use actual repository URL and no invented team identities. “Live” means the documented local product is running. Do not claim 90% internet coverage, tested native support for catalogue-only entries, reviewed law for all EU countries, actual therapeutic efficacy, unique-user statistics, or network-wide Tor interception.

References: [Safety](../../SAFETY.md), [plug-in contract](../../contract/PLUGIN_CONTRACT.md), [pitch](../../submission/PITCH_GUIDE.md), [one-pager](../../submission/ONE_PAGER_TEMPLATE.md), [team README](../../submission/TEAM_README_TEMPLATE.md), [design](../../DESIGN.md).
