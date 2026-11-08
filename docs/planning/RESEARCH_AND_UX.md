# Research and user experience delivery plan

This specification covers separate moderator, researcher, and visitor experiences for the local Before demo. The existing prototype supplies visual groundwork; these workflows still require implementation and acceptance evidence.

## Product boundaries

Dutch and English are fully functional. Other languages are preview-only. Platforms opt into each published study revision. Research uses synthetic demonstration traffic and aggregate outcomes; it receives no original submissions or visitor histories.

The default journey is supportive reflection, education, then professional help. Reflection-first is a hypothesis, not established treatment or a proven way to reduce arousal. Help and exit remain immediately available throughout. Persistent visitor cookies, behavioural profiles, repeat-offender categorisation, and inferred personas are outside scope.

The root `DESIGN.md` governs ivory/forest colours, Newsreader/DM Sans, spacing, and restrained motion. Its historical capability-status paragraph must eventually reflect implemented integrations. Open Design is design-time guidance, without product telemetry.

## Separate routes and shells

Every route supports direct navigation and refresh. Shared components are appropriate; mixing moderator and researcher controls in one sidebar is not.

| Route | Audience and purpose |
|---|---|
| `/` | Local launcher with explicit seeded demo-role choices and demo links. |
| `/moderator/overview` | Deployment status, published intervention, aggregate outcomes. |
| `/moderator/intervention` | Default-message editor, bilingual preview, legal toggle, publish/revert. |
| `/moderator/analytics` | Site-level aggregates, reporting threshold, export, synthetic batch generation. |
| `/moderator/integrations` | Branded catalogue with implemented/documented/planned status. |
| `/moderator/docs/:slug` | Platform-specific install guide, supported submission surfaces, snippets/downloads, verification and troubleshooting. |
| `/moderator/research` | Available study revisions, variant inspection, opt-in/pause/withdraw controls. |
| `/moderator/content` | Country packs, service languages, sources, translations, review/update status. |
| `/researcher/studies` | Research-only study list, lifecycle states, create/duplicate actions. |
| `/researcher/studies/:id/editor` | Hypothesis, outcomes, eligibility, variants and a no-code copy/motion composer; automatic even assignment. |
| `/researcher/studies/:id/results` | Variant-level aggregate comparison, denominators, suppression, export. |
| `/intervention/:siteId` | Visitor journey; no administrative navigation. |
| `/help` | Server-rendered directory functional without JavaScript. |
| `/demo/{forum,fieldnotes,discord,control}` | Fictional supported surfaces, labelled Discord simulator, comparison controls. |

Legacy combined hash routes redirect to canonical views rather than exposing duplicate workflows.

## Roles and authority

Use separate local demo role sessions and enforce permissions in `/api/moderator`, `/api/researcher`, and `/api/public`; hiding buttons alone is insufficient. Distinct role-scoped administration cookies allow both tabs to coexist; tests use separate browser contexts. The role picker is not production authentication. Visitor journeys need no account or tracking cookie.

Moderators edit only their deployment defaults, installations, study attachments, and site reports. Researchers author their studies and see only attached study aggregates; they cannot edit platform defaults, enable their own study on another platform, or access moderator drafts. Public configuration exposes published content only. Public deployment IDs are not administrative secrets.

Moderators opt into an exact published study revision after inspecting its hypothesis, variants, languages and primary outcome. Permit one active attachment per platform in this demo. Pause or withdrawal restores the platform default for new exposures. Opened journeys retain their frozen content version.

## Moderator authoring

The editor supports a named draft, Dutch/English headline, reflection body, education copy, navigation labels, service selection, and reviewed legal-block toggle. Use plain text; no arbitrary executable HTML. Statutes, service facts, and confidentiality blocks remain centrally managed.

Required behaviour:

1. Edit either language without losing unsaved changes.
2. Preview every stage at desktop/mobile widths and with reduced motion.
3. Save and refresh with the draft intact.
4. Validate both supported languages before publishing.
5. Publish an immutable version that appears on new demo exposures.
6. Revert by publishing a previous complete version, preserving history.

Preview actions do not count as intervention exposures. Pass the authenticated draft snapshot directly to the shared renderer with `mode: "preview"` and no collector connection; do not expose drafts in public config or URLs. Publication confirms success in place. Errors preserve the draft and offer recovery.

## Researcher authoring

A study contains a name, explicit hypothesis, primary outcome, eligible countries/languages/deployments, two to four variants, automatic even assignment across variants and versioned publication state (internal integer weights total 100%; no allocation controls). Primary outcomes are help-selection rate or journey-completion rate. Persona scenarios may label the research hypothesis; they never classify visitors.

Lifecycle: draft → published/available → running simulation → paused or completed. Drafts receive no traffic. Published changes create a new revision. Results remain associated with the exact study and variant versions. Completed studies cannot silently resume under altered content.

The no-code composer has editable blocks and a runnable isolated preview. On narrow screens, editor/preview become explicit modes. Controls include:

- Supportive, harm-focused, consequence-focused, or combined starting template; no assumed winner.
- Bilingual plain-text headings, bodies, and CTA labels.
- Sequencing is limited to `[reflection, education, support]`, `[education, reflection, support]`, and baseline `[education, support]`. Help/exit stay outside the sequence and cannot be removed.
- Reviewed legal block on/off; eligible service-directory entries.
- Two presets, **Reading** and **Scene**, using existing accessible design tokens.
- Static or optional bounded motion presentation.
- Preview language, country, viewport, and reduced-motion settings.

Bundled editorial suggestions may assemble copy. Label them templates, not AI generation. No paid model credentials, visitor text sent to a model, runtime-generated legal claims, or autonomous counselling.

Publication validates copy, eligible packs, languages, weights, help availability, and scene constraints. Researcher-authored content must actually reach the renderer; changing a dashboard title is not a working experiment.

## Three-scene motion

Deliver browser-native interactive motion, not generated film or an MP4 pipeline. Maximum three scenes reuse the static journey blocks: reflection, understanding, support. Allow scene text, permitted order, editable reading holds, and none/fade/gentle-slide presets. Derive the static poster from scene one; no upload or generative-poster tool.

Provide play, pause, restart, and scrubbing. Bound playback to 30 seconds with readable holds. The poster communicates the message without playback; visitors choose to play. Help, exit, and next-step controls remain outside the timeline and operate immediately. No forced wait, surprise sound, flashing, endless animation, or physiological claim.

Routine feedback is approximately 100–160ms; scene continuity approximately 200–300ms, using transform/opacity. Reduced motion uses static content or restrained fades while preserving controls. No-JavaScript visitors receive `/help`; a JS-only embed cannot promise submission interception without JS, which requires a platform server-side path.

## Assignment and measurement

New eligible synthetic exposures use the enabled published study, its allocation, and exact variant content. Assignment is per exposure and remains fixed in memory for that journey. Reloads are new exposures. No persistent person-level grouping or unique-person claim.

| Metric | Exact meaning |
|---|---|
| Shown | Intervention content becomes visible; once per exposure, not each rerender. |
| Stage shown | Stage reached; at most once per stage per exposure. |
| Help selected | First help-service selection in an exposure, not confirmed treatment. |
| Completed | Support stage reached, not a clinical outcome. |
| Exit selected | Explicit exit control used; not inferred browser/tab closure. |
| Time visible | Foreground-visible time converted to coarse duration buckets, without retained individual history. |

Help rate is help selections/impressions; completion rate is completions/impressions for the same revision, variant, site scope, and reporting window. Never average percentages. Missing/suppressed denominators display unavailable.

Results show hypothesis/revision, variant descriptions, coarse reporting window, aggregate counts, duration distribution, denominators, and export. No visitor drill-down or event timeline. Apply suppression below 10 to cards, charts, rates, and exports; complementary totals or filters must not reconstruct hidden cells.

Manual synthetic exposures and generated synthetic batches use the same assignment/counting boundaries. Distinguish both from real traffic. Batch generation must not hardcode reflection-first as the winner. Show scenario assumptions. No efficacy, significance, or long-term behavioural conclusion from simulated results.

The central architecture document owns telemetry transport and storage definitions. Researchers use the aggregate feedback to revise future messages; they do not receive live submissions or personalised psychological targeting data.

## Language and content trust

Dutch/English cover visitor stages, authoring, validation, navigation, offline help, and complete JS/WordPress/Discord quickstarts. Wider recipes have bilingual summaries and labelled English technical detail. Match supported browser preferences, fall back to English, and respect explicit language choice. Preview locales cannot become experiment-eligible or inflate supported-language pitch numbers.

Country packs are separate from translations. Each contains country code, services and actual languages, legal/confidentiality blocks, sources, immutable version, review date/status, and fallback rules. English UI does not imply English-language service availability.

Statuses: reviewed, needs verification (`[VERIFY]` where required), preview, unavailable. Only reviewed factual blocks publish. Unsupported jurisdiction omits local legal claims and offers country correction/directory help. Automatically distribute published pack versions; do not claim autonomous legal verification or an unbuilt global update service.

## State and design acceptance

Every fetching/authoring surface covers loading, empty, error, populated, and edge states. Forms distinguish dirty/saving/saved/published/invalid. Preserve input on failure. Keyboard focus, labels, mobile reading, contrast, and accessible static equivalents are mandatory.

Exercise empty studies, invalid weights, missing language fields, unavailable packs, no opted-in platforms, paused/withdrawn attachments, below-threshold reports, zero denominators, slow/offline responses, long titles at 375px, 200% zoom, keyboard navigation, reduced motion, and JavaScript disabled. Error is not an empty result.

## End-to-end acceptance

1. Edit both default languages; save, refresh, publish; a fresh synthetic submission shows the published version.
2. Reach help immediately; change country/language; external links contain no original input or visitor ID.
3. Open the separate researcher route; moderator mutations are rejected by its API session.
4. Create two materially different bilingual variants, including static/motion previews; publish a study.
5. Verify no study assignment before moderator opt-in.
6. Enable the exact revision; exercise both authored variants through synthetic exposures and aggregate counting.
7. Pause/withdraw; new exposures return to default, opened exposures keep frozen content.
8. Compare reporting/export to collector totals; previews do not inflate counts; suppression applies everywhere.
9. Restart; drafts, published versions, study attachments, and aggregate counts persist.
10. Repeat key journeys on mobile, keyboard, reduced-motion, unknown-country, and no-JS paths.

## Execution ownership

Separate owners handle shells/routing, moderator editor, research composer, visitor/motion renderer, assignment/attachments, aggregate reporting, content/translations, and visual QA. Freeze shared schemas/routes before parallel implementation. Owners change assigned modules only; the integration owner reconciles cross-module contracts.

Open Design references at revision `87a4f91c308170a8270458fc40fc66a86ed69aac`: `frontend-design`, `impeccable-design-polish`, `ui-animation` and its decision framework, plus craft `state-coverage`. Apply them with root `DESIGN.md`; claim visual or interaction checks only when observed.
