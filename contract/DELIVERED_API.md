# Delivered Before API

Before retains `sbis:trigger` and local `sbis:result` events for platform compatibility. The original starter backend is retained as reference; the runnable Before product uses `server/`, `gateway/`, and the endpoints below. A DOM result object is not a valid public collector body.

Load `/embed/before.js` with a public installation ID and the owned service origin. The installation ID identifies a platform, never a visitor. Public configuration is `GET /api/public/sites/:siteId/config`; it returns only published content, eligible enrolled arms, country/help references, an immutable publication key and a coarse reporting day.

An adapter supplies only validated type, severity, language and country metadata. The demo matcher runs only for explicitly bound synthetic forms. It never sends original text to the prevention module, URL or collector.

The shared collector accepts `POST /api/public/sites/:siteId/metrics` with this shape:

```json
{
  "schemaVersion": 1,
  "studyRevision": "reflection-first@1",
  "armId": "A",
  "reportingDay": "SERVER_ISSUED_DAY",
  "source": "demo_interaction",
  "counts": { "shown": 1 }
}
```

Use the actual published key and reporting day from configuration; do not construct or hardcode them. Default publication keys are `site:<siteId>@<revision>`; study keys are `<studyId>@<revision>`. Allowed counters are defined in `core/model.js`. Exact timestamps, raw durations, input, URLs, user/exposure IDs and unknown fields are rejected. Public requests omit credentials and referrers. Counter deltas are immediately aggregated; individual event records are not stored.

Moderator and researcher APIs use separate local demo-role sessions and ownership checks. The platform owner must explicitly approve a published study revision. The bounded local demo exposes that owner/operator action in the researcher workspace for its three owned test installations; publishing never enrols a platform. Drafts are not public. A published revision remains fixed for an open journey, while pause affects new assignment. Reports and CSV apply the same small-count suppression.

The generated simulation dataset is stored separately from manual synthetic demo interactions. These are demonstrations, not data from real at-risk participants or evidence of intervention effectiveness. See `docs/PRIVACY.md` and `docs/RUNBOOK.md`.

Engagement counters are `engagement_measured` (first visible education stage), `scrolled` (at most one user-initiated scroll signal during education), and `education_end_viewed` (at most one visible end-of-message marker). `scroll_rate` and `message_end_rate` use measured education exposures as their denominator. Existing historical buckets have no measured education exposures for these new metrics; their missing counters migrate to zero while their rates remain unavailable. `retention_30s_rate` uses the sum of finalized visible-duration buckets as its denominator and the two buckets at or above 30 seconds as its numerator. It is withheld unless all four duration cells are reportable. All rates are percentages, and hidden inputs remain hidden in both JSON and CSV.

## Workspace boundary

Moderator routes provide installation settings, deployment verification and default-message editing. Moderator metrics, CSV export and simulation endpoints are absent; researcher study reports and CSV exports remain role scoped. The legacy moderator enrolment API remains an integration capability for explicit platform-owner consent, without research or analytics views in the moderator UI.

`GET /api/researcher/studies/:id/platforms` lists only the three owned local test installations and returns `authority: "local_demo_operator"`, the current publication, participation totals and each installation’s consent state. `PUT /api/researcher/studies/:id/platforms/:siteId` accepts `{studyRevision, enabled, confirmReplacement?}`. Approval is explicit, version pinned and limited to a published version of the selected study. Replacing another enabled revision requires `confirmReplacement: true`; withdrawing cannot disable an unrelated study. Paused and completed studies cannot be newly enabled. These seeded local roles do not grant a production researcher platform-owner authority; a real deployment must keep owner consent separate.

## Experience layouts

Published interventions accept four explicit `layout` values: `reading` for the calm reading journey, `scene` for optional motion scenes, `plain` for an unadorned legal-information and support experience, and `meaning` for values and reflection. Layout is part of the immutable published snapshot; draft changes do not rewrite a published experience. Arbitrary layout identifiers and inline layout markup are rejected. The supported stage sequences remain unchanged; a plain education/support experience uses `["education", "support"]`.

The plain preset is a browser-rendered one-page presentation, not a claim of JavaScript-free interception. `/help` remains the server-rendered no-JavaScript fallback. Jurisdiction-specific law or investigation statements belong in the reviewed country block and display only when that country matches. A Dutch-authored preset must not apply Dutch statutory or investigative claims to an unknown country. No preset may imply that a visitor has been identified, tracked or reported.

## Authored message blocks

Interventions may include optional `blocks` and `appearance` fields. Old interventions without these fields remain valid. `appearance` is one of `default`, `facts`, `quick-help` or `guided`; it selects a bounded visual treatment, never arbitrary CSS or executable markup. The six complete moderation templates combine layout, appearance, stage order and complete Dutch/English copy. Template application changes a draft; it does not rewrite a published snapshot.

`blocks` has exactly three arrays: `reflection`, `education` and `support`. Each stage supports up to six supplemental blocks. A block has only `{id, type, en, nl}`. IDs match `[A-Za-z0-9_-]{1,64}` and must be unique across the message. Supported types are `text`, `callout`, `quote`, `list` and `divider`. Both language versions are required, with a 600-character limit per version; divider text may be empty. Lists use one text item per line. URL, HTML, script, arbitrary style and unknown properties are rejected as block properties; text containing markup is displayed literally after escaping. See [the schema](schemas/intervention-content-blocks.schema.json).

The existing headline/body fields remain the main stage content and the native Discord compatibility copy. Supplemental blocks render immediately after that body, before reviewed legal information, service cards or navigation. Education-end visibility is measured after all education blocks and the reviewed legal block. Author-preview selection affordances are never delivered to visitors, and preview actions do not emit measurement events. The reviewed-law and support-service slots retain their existing jurisdiction and availability rules.


## Local Discord installation

`GET /api/moderator/discord` returns sanitized installation status and its OAuth authorization URL without starting a connection or writing Discord configuration. `POST /api/moderator/discord/connect` accepts only an empty object and explicitly finishes setup: it connects the locally managed bot and idempotently creates or enables only that bot’s named synthetic AutoMod rule. Both require the moderator session and existing gateway/origin protections.

Status has six boolean checks: `configuration`, `gateway`, `server`, `permissions`, `commands` and `protection`. `ready` requires all six. `setup_required` means the connection is verified but the protection rule is absent, disabled or invalid. `protection_error` reports a safe setup/readback failure. Protection readback verifies the owned rule name and creator, enabled state, message-send event, keyword trigger containing `test-trigger-red`, and block-message action. An explicit repair preserves the custom block notice and other actions; foreign rules are left alone. No aliases or production detection vocabulary are added.

No token, interaction text, member record or native Discord analytics is returned. Credentials are configured once by the local operator. Startup resumes the bot and checks protection without enabling a disabled rule. A fresh server installation event received after the Gateway is ready can finish its authorized setup automatically. Concurrent Finish setup requests share one operation; a setup request arriving during read-only verification is retained and applied afterward when connection checks pass.
