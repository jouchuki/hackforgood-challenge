# Submission delivery plan

The submission must demonstrate fast adoption, a useful prevention journey, and a research workflow that preserves privacy. It must match the software actually delivered. The required working prototype, three-minute pitch, repository and short description come from [BRIEF.md](../../BRIEF.md); the repository also requires a one-pager. Jury weights and pitch expectations are defined in [PITCH_GUIDE.md](../../submission/PITCH_GUIDE.md).

## Deliverables and ownership

These are execution deliverables, not files claimed complete by this plan. The submission agent owns prose and presentation; integration owners supply packages and verified installation steps; QA supplies evidence; the lead reconciles every claim with the final release.

| Deliverable | Destination | Acceptance |
|---|---|---|
| Team README | `submission/TEAM_README.md`, linked from root `README.md` | Explains what works, target users, prerequisites, exact launch/install steps, status matrix, safe testing and next steps. Use supplied team identities only; omit an unconfirmed roster rather than invent names. |
| One-page rationale and safe test plan | `submission/ONE_PAGER.md` | Covers Starting persona as the initial design scenario, the small-platform moderator, Netherlands-first content, evidence, outcomes, privacy and a proposed controlled rollout. A persona is a design scenario, never an inferred visitor classification. |
| Pitch script | `submission/PITCH_SCRIPT.md` | Spoken script with slide and demo cues, no more than 180 seconds in rehearsal. Sources are footnoted rather than read aloud. |
| Five-slide deck | `submission/deck/index.html` with local assets | Actual keyboard-navigable presentation, readable from a projector, no remote fonts or images. Add a PDF only if exported and visually verified; a PDF is not a prerequisite for this browser-based pitch. |
| Demonstration runbook | `submission/DEMO_RUNBOOK.md` | Exact commands, routes, clicks, reset, expected results and fallback. No undefined scripts or setup placeholders remain at handover. |
| Submission description | `submission/JUNCTION_DESCRIPTION.md` | Concise product description, how it works, why it fits, actual repository URL and known implementation boundaries. No invented team, deadline or deployment URL. |
| Q&A sheet | `submission/JURY_QA.md` | Short, defensible answers to the questions below. |
| Evidence index | `submission/EVIDENCE.md` | Test results, build version, integration status and local screenshots/recording tied to the release being shown. |
| Release manifest and package | `release/manifest.json`, `release/before-demo.zip` | Generated from the final build; names every included artifact, version/checksum and verification status. Generated release output is excluded from source commits if the master plan specifies that convention. |

Keep the original challenge and templates intact. The completed team README becomes the product handover; root README provides an obvious quick start and links to it.

## Release contents

The reproducible package includes the built application, stable browser embed, installable WordPress ZIP, local npm SDK tarball, runnable Discord bot, offline Discord simulator, `.env.example` containing names but no credentials, framework recipes, branded integration documentation, locally served favicons/fonts, country/language packs, source and licence provenance, and the submission materials above.

Exclude real tokens, `.env` files, runtime state, request logs, personal data, and dependency directories. Include dependency lock information through the release mechanism chosen by the master plan. A clean checkout must reproduce the documented build without relying on an agent's temporary directory.

Every integration uses the frozen labels **Tested**, **Package ready; connection pending**, **Recipe**, or **Planned**. Discord's shared-handler simulator is tested locally; the real adapter remains connection-pending until credentials are supplied. Do not call that connection tested. Dutch and English are complete; other languages remain labelled previews. A country selector or country-pack schema is not proof that a jurisdiction's legal text has been reviewed.

## Deterministic demonstration

The runbook uses the master plan's frozen launch/reset commands. Its author must verify those commands from a clean start and replace all planning references with literal executable commands before delivery.

1. Preinstall dependencies and cache all required assets, including the WordPress Playground runtime. Reset only the generated synthetic workspace. Start the local proxy/application, second-origin website and required simulator; confirm readiness rather than assuming fixed ports are free.
2. Open the moderator overview, installation catalogue and researcher studio in separate prepared tabs. Keep the end-user journey in a separate tab without moderator chrome.
3. In the moderator view, edit the English first message, preview it, publish it and prove the published revision reaches the website. Switch to Dutch to demonstrate a complete translation; show additional languages as previews.
4. On the mock website submit only `test-trigger-red`. Show the full-page reflection, education and help route. Use a deterministic arm override available only in demo mode; do not gamble on random allocation during the pitch.
5. Demonstrate the same build from a second website origin. Show the installed WordPress plugin and use its supported synthetic search/shortcode surface in the extended walkthrough. The short pitch need not repeat the whole journey three times.
6. Show the Discord simulator using the actual bot handlers. Explain that real Discord needs the owner's app credentials; do not pretend an offline transcript is a live Discord connection.
7. In the researcher view, alter a variant or motion scene and publish a study revision. In the moderator view explicitly enable that revision. Verify eligible synthetic exposures receive it.
8. Run a seeded synthetic batch through the same assignment/counting path. Inspect variant aggregates and small-count suppression. Do not claim that one manually clicked exposure proves efficacy or that a help click means treatment occurred.
9. Restart and confirm published configuration survives. Keep the reset operation repeatable for rehearsal.

The demonstration must remain usable without an internet connection once dependencies and runtimes are cached. External help destinations remain genuine links; the offline pitch shows the handover without requiring those services to load. Never submit forms, call services, or contact real people to demonstrate the product.

## Three-minute pitch

| Time | Slide or surface | Point and action |
|---|---|---|
| 0–25s | 1: The missed moment | Describe the small Dutch forum and part-time moderator. Establish the gap between displaying a warning and reaching help. |
| 25–45s | 2: Installation | Show the actual snippet, WordPress package and Discord delivery options. Present broader framework recipes with their honest status. |
| 45–100s | Live website journey | Submit the synthetic example, show the published message, move through education, and select a help route. Briefly switch Dutch/English. |
| 100–140s | 3: Research studio | Show a custom variant or restrained motion scene, explicit moderator opt-in and aggregate comparison. State that results are simulated. |
| 140–165s | 4: Trust and evidence | Explain no visitor profiles, country-only application hint, no retained IPs, and reviewed content. Reflection-first is a hypothesis; message effects require evaluation. |
| 165–180s | 5: Next step | Ask for a platform/research partner for a controlled pilot. End with the concrete benefit: easier adoption and a clearer route to help. |

Slides support the demo rather than duplicate its screens. Keep the catalogue walkthrough, WordPress installation and Tor fallback ready for Q&A. Rehearse twice with an external timer; shorten the script instead of accelerating delivery.

## Two-minute Q&A preparation

- **What is installed today?** Cite the release's tested integration matrix; separate live Discord verification from the simulator.
- **Does this detect abuse?** No. The prototype uses fake submission matches; existing platform detection can supply the same metadata contract.
- **How do researchers obtain traffic?** A moderator enables a published study revision; assignment is per exposure and researchers receive aggregates only.
- **Does the reflection calm arousal?** That is unproven; the implemented journey is a testable design hypothesis.
- **How is effectiveness measured?** Distinguish warning exposure, stage progression and help selection from treatment, unique people or prevented abuse.
- **What about repeat visitors?** No persistent identification or offender categorisation is implemented.
- **What about countries and Tor?** Explain approximate country hints with manual correction, reviewed-country boundaries, the no-JavaScript help page and optional onion deployment recipe.
- **Does it support 90% of the internet?** No measured coverage claim is available. Show the actual integration/package/recipe count instead.

## Submission gate

QA must verify clean startup, all three integration deliverables, separate views, publish-to-render behaviour, study opt-in, Dutch/English, aggregate export suppression, persistence, no external asset requests, and the fallback presentation. Capture a short local screen recording and representative screenshots after those checks pass; the recording must match the final build.

The lead checks every link and package from the release archive, removes template instructions, records unresolved verification honestly, and confirms the 180-second rehearsal. The user/team then uploads the repository link, description and required materials to Junction using their account. This plan does not authorise or claim external submission; no platform deadline or upload requirement beyond the provided challenge materials is invented.
