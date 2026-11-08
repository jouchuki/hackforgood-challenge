# Next Step verification record

This record distinguishes executed checks from planned acceptance. It covers the local synthetic demonstration and the verified Discord bot connection. A regular-member AutoMod block, a complete live Discord help interaction and a real participant study remain unverified.

## Baseline preflight

On 7 November 2026, the repository safety check, the two existing safety-checker tests, and the original Vite build passed. That build emitted runtime-relative URL warnings. Those baseline results did not verify the expanded application.

## Expanded application checks

| Area | Check | Status |
|---|---|---|
| Browser roles | Separate moderator/researcher routes and navigation; role API separation | Passed in Chromium |
| Publication | Exact bilingual moderator publication reaches visitor renderer | Passed in Chromium |
| Authored research | Create variants, publish, explicitly approve a platform and deliver actual authored content | Passed in Chromium |
| Reporting | Stored simulation and demo outcomes remain distinct; small cells and rates hidden; CSV export | Passed in Chromium |
| Integration catalogue | Local icons, guide pages, downloads and explicit status labels | Passed in Chromium; 23 catalogue entries |
| Language/accessibility | Dutch, mobile layout, preview language status, reduced motion | Passed tested interactions at 390×844; full accessibility audit not claimed |
| Low-script help | Server-rendered help works with JavaScript disabled | Passed in Chromium; no external asset requests |
| Cross-origin embed | Built bundle redirects from the second-origin website without original input | Passed against the freshly built standalone bundle |
| React | Local wrapper connects, unmounts/remounts and redirects a synthetic submission | Passed in Chromium |
| SDK archives | Extracted browser/React tarballs import their packaged runtime entrypoints | Passed module-import smoke check; registry publication and separate type compilation not claimed |
| Route resources | Workspace/demos render without runtime script errors, local failures or remote asset requests | Passed final production route sweep |
| WordPress | Actual local Playground installation and supported submission flow | Three browser cases passed against WordPress 6.8; the current runtime reports PHP 8.5.4. Generated ZIP installation, activation and deactivation were also checked in a separate fresh instance |
| Discord | Shared-handler simulator, moderator-only setup and synthetic AutoMod action | Passed simulator interactions and safe missing-configuration diagnostics; live Gateway login, target server access, Manage Server permission and actual slash-command registration verified |
| Persistence/privacy | Restart, strict payload validation, IP/header/log boundaries | Covered by the passing 47-case Node suite |
| Build and dependencies | Safety check, production build and dependency audit | Passed; npm audit reported zero vulnerabilities at verification time |
| Source archive | Extract release source into a clean temporary directory, safety-check and build | Passed with the existing locked dependencies symlinked in; fresh dependency installation was not tested |

## Role and experience verification

On 8 November 2026, the production run passed all 23 cases in `qa/browser.spec.js`, `qa/clarity.spec.js` and `qa/revision.spec.js` in 41.1 seconds. Its result is recorded in `.before/qa/automatic-studies-final/.last-run.json`. The unchanged WordPress integration retains its three-case result from the preceding revision: 11.6 seconds, recorded in `.before/qa/next-step-wordpress/.last-run.json`. The current safety check, production build and 66 Node tests also passed.

| Area | Executed check | Result |
|---|---|---|
| Moderator scope | Overview, message, installation and country screens contain no research or analytics controls and issue no report requests; legacy research/results URLs redirect to overview | Passed |
| API separation | Moderator metrics, export and simulation endpoints return 404; a moderator-only session cannot access researcher results | Passed |
| Automatic assignment | Setup and Review contain no traffic allocation controls or percentages; adding a third variant saves 34/33/33, removing it saves 50/50, and two published variants reach the installation at 50/50 | Passed |
| Message presets | The supportive/harm comparison contains distinct authored copy; the legal wording preset changes the education content actually shown first | Passed |
| Platform approval | A study supplies no messages before explicit local operator approval; after confirmation, its automatically assigned variants reach the selected installation | Passed |
| Independent websites | MySmall20kUserForum and Fieldnotes have their own chrome and typography; MySmall20kUserForum filters ordinary queries locally and completes the real SDK diagnostic handover | Passed |
| Three experiences | Plain legal, calm and meaning-focused presets produce distinct rendered pages and headlines; a three-arm comparison publishes at 34/33/33 | Passed |
| Distinct message copy | In English and Dutch, Calm reflection focuses on an immediate pause/reset without future, relationship or life-value framing; Meaning asks direct time or life-direction questions | Passed |
| Plain page | Legal information and help appear on one page without stage navigation; actual information/help visibility and help-link selection are counted once | Passed |
| Country previews | Unknown country removes Netherlands-specific legal information and support providers; selecting Netherlands restores its provider cards | Passed |
| Country eligibility | An unknown country does not receive the Netherlands-only study; its fallback contains no Netherlands legal article or enforcement claims | Passed |
| Measurement boundaries | Author previews, published unmeasured previews and deployment diagnostics produce no research metric POSTs | Passed |
| Responsive delivery | All three published experiences render at desktop and mobile widths without horizontal document overflow | Passed |

After the preceding role/experience revision, targeted cleanup removed the 15 studies whose IDs were recorded in the test manifests and two trailing inactive test publications. Three nonmanifest studies were preserved. The cleanup created a backup and did not reset owner-authored data or refresh any example counter buckets.

A subsequent read-only catalogue check verified all 23 cards retain local icons, platform names, implementation statuses and setup actions while containing no description paragraphs. The JavaScript guide retained its introduction, four installation steps and code example.

Research platform controls in this package are a local self-hosted operator capability. They expose only the three owned installations and require an explicit confirmation. They do not grant an external researcher authority over an unrelated platform, automatically enrol installations or silently replace an approved publication.

The current comparison gallery is `artifacts/ui-revision/index.html`. It preserves eight matching before and after views. Six additional full-page screenshots show the published plain, calm and meaning-focused experiences at 1440×1000 and 390×844 viewports. Those new experience views are separate from the matched comparisons; they have no fabricated earlier equivalent. Public experience screenshots use unmeasured preview delivery. An additional catalogue comparison preserves the user-provided earlier crop beside the current expanded grid; it is explicitly labelled as a contextual comparison with different framing.

## Earlier clarity and engagement verification

An earlier clarity revision on 8 November 2026 passed all 18 scenarios in `qa/browser.spec.js` and `qa/clarity.spec.js` in 28.9 seconds. Its result is recorded in `.before/qa/clarity-final/.last-run.json`. Three cases in `qa/wordpress.spec.js` also passed in a separate 7.5-second run. Browser output uses isolated directories under `.before/qa/`.

| Area | Executed check | Result |
|---|---|---|
| Message publishing | Exact English and Dutch authored copy reaches the visitor | Passed |
| Study publishing | Two authored variants publish, require explicit platform approval, and reach actual visitor renders | Passed |
| Stage editing | Education-first variants edit education fields and show that same stage in preview | Passed |
| Unsaved changes | Keep editing retains the input; discard restores stored content; Save and leave persists the draft before navigation without changing the publication | Passed |
| Publication review | Editing actual message content enables the initially disabled publication action without publishing the existing seed study | Passed in the current run |
| Optional controls | Motion timing stays hidden until enabled; mobile editing and preview remain separately reachable | Passed |
| Information controls | Accessible SVG-only buttons open disclosures; normal navigation has no Discord rehearsal links | Passed |
| Aggregate comparison | Generate 240 exposures through presenter controls; compare displayed rates, percentage-point difference, duration retention and engagement rates with stored aggregates | Passed |
| Small cells and CSV | Small recorded-interaction counts and derived rates stay hidden; export retains source/publication context without visitor identifiers | Passed |
| Actual scrolling | Trusted wheel input followed by document scrolling increments one coarse counter; programmatic scrolling alone does not | Passed |
| Content end | A fitting desktop message counts its visible end without scrolling; a long mobile fixture counts its end after scrolling; revisits do not duplicate counts | Passed |
| Browser deployment | SDK load, submission and rendered intervention complete the administrator-started diagnostic | Passed |
| WordPress deployment | Installed SDK and actual core-search server redirect complete the same diagnostic | Passed |
| Unmeasured views | Preview and diagnostic visits, including information-step scrolling, produce no collector POSTs | Passed |
| Platform assets | All 23 catalogue assets load locally; guide configuration follows the selected installation | Passed |
| Language and access | Dutch UI, additional-language visual preview, reduced motion, 390-pixel layout and no-JavaScript help remain usable | Passed tested interactions |
| SDK lifecycle | Second-origin submission works; React mounts, unmounts, remounts and redirects | Passed |
| Route resources | Product routes and direct Discord rehearsal load without script errors, failed local resources or remote asset requests | Passed |
| WordPress rendering | Public page has no PHP deprecation output; native settings retain capability and nonce protection | Passed |

The scroll fixture lengthens only the intercepted education content in the test browser to require mobile scrolling. It does not modify published participant content. Collector assertions require successful server responses and permit only aggregate counters plus installation/publication/arm/day context; scroll coordinates, viewport measurements and raw durations are not transmitted.

Retention rates use finalized visible-duration buckets. An education-end signal establishes viewport visibility, not reading or understanding. Help-link clicks do not establish receipt of professional help. No statistical or clinical effectiveness finding is inferred from these checks.

The browser checks restore the Fieldnotes installation's original active publication, draft and enrolment. Diagnostic challenges are installation-level, expire after ten minutes and remain in memory. External support navigation is intercepted during tests; no help service is contacted.

## Screenshot comparisons

The comparison gallery is in `artifacts/ui-clarity/index.html`, with 21 matched route/view comparisons. Original audit screenshots are preserved unchanged in `before/`; matching current captures are in `after/`. Desktop viewports are 1440 × 1000 and mobile viewports are 390 × 844. The original combined composer supplies the baseline for both the new setup and message views.

Three additional examples document completed browser and WordPress deployment checks and a freshly authored study's reportable engagement results. They are explicitly separated from matched comparisons. The screenshots are interface and verification evidence, not research findings.

The two unchanged bundled example buckets were refreshed with neutral engagement counters while preserving their original 800 intervention views and 80 help-link clicks. This updated demonstration data only; historical recorded visitor traffic was not backfilled. The fixture source remains distinguishable in the reporting controls and information dialog. The four studies and inactive publications created by these tests were removed through targeted cleanup; the original study and owner-authored data were preserved.

## Release checks

The current revision passed the safety check, production build and 66 Node tests. The earlier release also passed a dependency audit with zero vulnerabilities. WordPress used the actual local Playground runtime with WordPress 6.8; although the CLI requests PHP 8.3, the running worker reports PHP 8.5.4. A separately generated plugin ZIP was previously installed, activated and deactivated in a fresh instance at port 9401.

The generated source archive was extracted into a clean temporary directory and passed the safety check and build using a symlink to the existing dependency tree. This verifies archive completeness for that build; a fresh `npm ci` and registry publication remain outside the executed checks. Extracted browser and React package runtimes imported successfully from their tarballs; separate TypeScript compilation was not tested.

The real Discord bot logged in successfully and the managed service verified the configured server, Manage Server permission and registered slash commands. REST inspection confirmed the bot-owned synthetic AutoMod rule exists, is enabled, uses only `test-trigger-red`, and has the block-message action without explicit role or channel exemptions. The owner confirmed successful regular-member blocking with the exact phrase. The complete live help-link and language-button interaction remains unverified. No Tor Browser session, production hosting or real participant study was exercised. The local DB-IP country database was downloaded and loaded; public-IP geolocation accuracy was not evaluated. The no-JavaScript help test verifies the fallback page in Chromium rather than a Tor network connection. Synthetic traffic and screenshots are demonstration evidence, not research findings.

After the automatic-assignment run, targeted cleanup removed the three studies recorded in `.before/qa/automatic-created-studies.json` and one trailing inactive QA publication. All four nonmanifest studies were preserved, no example counters were refreshed, and the production gateway and private API were restarted successfully.


## Managed Discord setup

The production application now owns the Discord process. The moderator dashboard provides the application’s OAuth installation link and a real verification action, with separate configuration, Gateway, server-access, permission, command-registration and protection checks. The latest live check returned Ready on the configured test server with all six checks true. The install link exposes only the application and configured server IDs; the bot token stays in the local server environment. Native interactions do not post research or analytics events.

Seventeen controller/API tests cover missing configuration, OAuth scope and permission bounds, real-SDK method shapes, guild and permission failures, command readback, preservation of unrelated commands, application mismatch, sanitized errors, timeout and concurrent verification, credential changes, safe asynchronous/synchronous SDK teardown and moderator-only API access. All 66 Node tests passed in the final implementation run.

All twelve cases in `qa/discord-setup.spec.js` passed in 7.7 seconds, recorded in `.before/qa/discord-mobile-final/.last-run.json`. Both Discord controller endpoints were intercepted before navigation, and external requests were blocked. These checks did not contact Discord or start a real bot connection.

| Area | Executed browser check | Result |
|---|---|---|
| Missing configuration | No credential or server-ID inputs; absent application/server configuration disables verification and omits installation | Passed |
| Return from installation | Known IDs retain installation and verification; focus refresh updates the displayed state to Ready through a status GET without a setup POST | Passed |
| Installation URL | Configured application/server, bot and application-command scopes, Manage Server permission and no Administrator permission | Passed |
| Readiness | All six checks must pass; a ready response with unverified commands or missing protection cannot advertise readiness | Passed |
| Explicit setup | Missing protection presents the message-blocking action; repeated pending clicks send only one empty-body setup request | Passed |
| Automatic completion | Connecting status polls GET only and displays completed automatic installation without issuing a setup POST | Passed |
| Recovery | Protection errors and failed setup HTTP responses retain retry; a successful attempt replaces the failure state with verified protection | Passed |
| Stale status | A failed status refresh removes Ready and the testing controls without attempting setup | Passed |
| Navigation and testing | Normal testing actions provide the exact test phrase, support and admin-preview commands without requiring `/before setup`; no simulator link or obsolete bot description appears | Passed |
| Mobile header | At 390×844, Dutch and English keep the document within the viewport; menu, information, language, Open Discord and reapply controls remain visible and horizontally contained | Passed |

The existing workspace route/resource sweep, including `/moderator/docs/discord`, passed as one targeted case in 5.9 seconds, recorded in `.before/qa/discord-finish-route/.last-run.json`. The preceding full 23-case browser suite was not repeated for this isolated setup change. These checks created no studies and changed no research counters.

The `/before setup` guidance includes the platform’s implicit exemption: administrators and members with Manage Server bypass AutoMod. After correcting the typed phrase, the owner confirmed the regular-member block worked. See [Discord’s AutoMod FAQ](https://support.discord.com/hc/en-us/articles/4421269296535-AutoMod-FAQ).

The final simplified setup requires no Discord setup command. Fresh installation can enable the synthetic rule automatically; the explicit dashboard setup action creates or enables only the bot-owned rule and verifies readback. Startup only checks protection, preserving intentional disabling. Live Finish setup on TEST returned all six checks true and preserved the existing rule, warning, actions and exemptions. Canonical test input remains `test-trigger-red`.

Final live visual checks passed at 1440×1000 and 390×844 in English and Dutch. Copy actions produced the exact canonical test phrase and support command. The moderator page emitted no measurement requests or browser runtime errors. Final screenshots are in `artifacts/ui-revision/after/discord-setup*.png`; the comparison gallery retains the original setup guide as its baseline. Integration footprint figures and their measurement boundaries are recorded in [COVERAGE.md](COVERAGE.md).

## Visual builder, integration library and research lab

The final coordinated implementation passed all 91 Node tests and the safety check. All 45 browser cases passed in `.before/qa/product-builder-final/.last-run.json`, including the previous 23 regressions, 12 Discord setup cases and ten new builder/lab/guide cases. The two integration issues found by that run—credential loss through duplicate focus handlers and a filtered card removed by search blur—were fixed and the canonical run was repeated successfully.

New checks prove six distinct rendered templates, bilingual block editing and immutable published delivery, keyboard/drag reordering, structural Undo/Redo, country fallback, all 23 installation guides, actual code copying/downloads, protected credential flows, optional OAuth states, saved research views, aggregate path deduplication and PostHog snapshot configuration/export with injected transport. Provider tests use temporary files and mocked responses; no real PostHog project delivery or Discord account sign-in is claimed without owner credentials. Native bot connection and regular-member test blocking were verified separately.

Current screenshots are served at `/review/message-builder/`, `/review/integrations/` and `/review/research-lab/`. The technical architecture is in [ARCHITECTURE.md](ARCHITECTURE.md).

Final targeted cleanup removed the six exact-manifest QA studies and five trailing inactive Fieldnotes publications. All four nonmanifest studies and owner publications were preserved. The production service was restarted with the finalized renderer, integration configuration, OAuth controller and research lab. PostHog snapshot deduplication also preserves previously exported snapshots when switching between views, and its query follows the selected export.
