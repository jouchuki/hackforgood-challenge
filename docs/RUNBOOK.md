# Local technical demonstration

Use Node.js 22 or later and npm. All product assets are served locally. Discord requires an internet connection only when using the real bot; the simulator works offline. First-time WordPress and country-database preparation downloads development assets.

```bash
npm ci
npm run demo:prepare
npm run build
npm run dev
```

Open `http://localhost:3000/`. The moderator and researcher have separate routes and seeded demo sessions. These sessions demonstrate role boundaries; the local role picker is not production identity management.

1. Open the moderator intervention editor. Change the English and Dutch copy, save, publish, and preview the exact published revision.
2. Open `/demo/forum` and submit `test-trigger-red`. The supported fake match cancels submission and opens the full-page intervention. Ordinary inputs stay with the fictional platform.
3. Move directly to help or follow reflection, education and support. Help destinations are independent services; do not call or send chats to demonstrate the prototype.
4. Open the researcher workspace. Create/edit a study with two to four complete variants and a primary outcome; new comparisons use an automatic even split. Publish it.
5. Open that study’s Platforms view in the researcher workspace and explicitly review and enable that version on an owned test platform. New demo exposures use those variants; pausing returns future exposures to the platform default.
6. In analytics, distinguish actual synthetic demo actions from generated simulations. Generate a seeded batch to make aggregate comparisons reportable. Values below ten remain hidden. Do not present simulated differences as research evidence.
7. Open a study's results for arm-by-arm counts, help-selection rates and duration buckets. Export the same suppressed aggregates.

For a built application without Vite:

```bash
npm run build
npm start
```

The owned gateway is port 3000. The private API is 3001, private Vite 3002, optional second-origin fixture 3004, and WordPress Playground 9400. Use the gateway links, not the private API port.

```bash
npm run demo:site
npm run demo:wordpress
```

The WordPress example is an actual local WordPress 6.8 Playground runtime. Visit `http://localhost:9400/` and Settings → Next Step Prevention. The mounted plugin supports core search and `[before_demo]`; it does not automatically cover every third-party community form.

`npm run demo:seed` initialises missing state. `npm run demo:reset` explicitly resets generated local workspace data; stop the app before resetting from the CLI. Published state otherwise persists across restarts in ignored `.before/` files. Browser input is not persisted.

Run checks with `npm run check`, `npm test`, `npm run test:browser`, and `npm run test:wordpress`. Browser tests require a running product; WordPress tests also require the Playground service. The final verification report records which checks were actually performed.

The real Discord bot is configured separately using its local environment example. Never paste bot credentials into the website or commit them. A remote Discord member cannot open the presenter's localhost; configure a reachable HTTPS service origin before a remote deployment. No public tunnel or onion service is created automatically.

Use **Check deployment** in the installation guide to start a ten-minute walkthrough. Open the generated installation URL, submit the test example, then return to the check. A successful SDK load, test submission, and intervention render verify that route. Diagnostic requests do not enter research results, and their progress is kept only in memory.

## Interface and deployment checks

The moderator navigation is Overview, Message and Install. Research studies and all analytics are exclusively in the researcher workspace. Languages and countries are in the secondary navigation. The information icon opens privacy, measurement and demonstration details.

On Install, select the intended installation and run the deployment check. Open its test URL, submit `test-trigger-red`, and keep the dashboard open. Verification requires the script-loaded, submission-intercepted and intervention-rendered receipts. A reachable service alone is not a verified website. The check uses a short-lived installation diagnostic and contributes no research metrics. Discord connection is confirmed in the real bot process, separately from the browser deployment check.

The research composer separates Study setup, Messages, and Review and publish. New comparison views are assigned automatically across variants on platforms opted into that exact published version. Publishing a new version does not silently replace a platform's approved version. Research results include outcome comparisons, foreground-time retention, scrolling in the information step, message-end visibility, and help-link clicks. Measurement definitions are available from the information icons.

`npm run test:clarity` runs the focused usability and deployment regression suite. Screenshots are in `artifacts/ui-clarity/`, with a standalone comparison gallery at `artifacts/ui-clarity/index.html`. The build also serves the gallery at `/review/ui-clarity/`. The unlisted Discord rehearsal remains `/demo/discord`; the product does not link to it.

## Experience presets

Next Step supports three complete intervention presets: Plain legal page (one-page information and inline support), Pause and reset (an immediate, practical pause), and Life direction (direct questions about time, priorities and values). Each preset supplies editable English and Dutch copy and a distinct layout. The plain page is a browser-rendered HTML experience; `/help` remains the separate no-JavaScript fallback. Dutch enforcement information appears only with the reviewed Netherlands country pack. No template claims the visitor has been identified, logged or reported.

Study creation includes paired comparisons and a three-experience comparison. Assignment is automatic: two variants split 50/50; three split 34/33/33. Researchers do not configure traffic allocation. Platform participation is operated explicitly from the researcher workspace in this bounded local-owner demonstration; new publications do not silently replace an already approved version.

The visible product name is Next Step. Existing `Before` SDK identifiers, package names, environment variables and service URLs stay compatible. Latest screenshots are under `artifacts/ui-revision/` and served at `/review/ui-revision/`.

## Automatic comparison and distinct messages

Study setup has no traffic allocation controls. New drafts and newly published comparisons use an automatic even split (integer percentages total 100%). Existing published versions retain their saved allocation until an explicitly approved replacement. Adding or removing a variant rebalances the new draft automatically.

Pause and reset uses short, immediate prompts to step back from the screen, with direct information and support. Life direction uses a more pointed question about time, priorities and the life someone wants to build. Both presets include complete editable Dutch and English copy. Applying an updated preset replaces that variant's draft copy and can be undone; existing published messages are not silently rewritten.


## Discord dashboard connection

The deployment owner configures the bot once. Moderators use **Install → Discord → Add to Discord** and authorize the server. The running service registers commands and completes the bot-owned test rule for a fresh installation. **Finish setup** or **Enable message blocking** completes an interrupted installation from the dashboard. Ready requires six checks, including actual protection readback; no Discord setup command is required.
The protected owner credential form sends the bot token to the first-party administration API; the token is stored in the ignored 0600 environment file and is never returned, logged or placed in browser storage. Blank secrets preserve saved values. Missing configuration, absent server access, missing permissions and failed checks remain distinct states. The standalone ZIP remains available under Self-hosted setup; run either the application-managed bot or that standalone process, not both.

## Discord installation completion

Open Moderator → Install → Discord and choose Add to Discord. A fresh installation enables the bot-owned test rule automatically while the local service is running. If setup needs completion, choose Enable message blocking or Finish setup in the dashboard. Ready requires all six checks, including a readback of the enabled block rule. A normal service restart preserves a rule disabled in Discord. The standalone `/before setup` command remains optional. Members use `/before support` for help and do not configure the bot. Test blocking with exactly `test-trigger-red` from a regular member account; admins and members with Manage Server are exempt. The owner confirmed successful regular-member blocking in the live test server.

## Visual builder, installation library and research lab

Moderator → Message now provides the template library and block builder. Choose a complete bilingual template, edit its journey and blocks, preview both languages, save a draft, then review and publish. Templates span legal information, calm reflection, life direction, factual harm, immediate help and guided scenes. Text, callout, quote, list and divider blocks can be reordered with drag or keyboard controls; structural and template changes support Undo/Redo. Research retains variant authoring and comparisons with its optional template picker collapsed.

Install contains 23 platform-specific guides, with owner credential setup and optional real OAuth2 account connection for Discord. Package downloads and manual embed recipes are labelled by their actual method.

Research lab provides configurable aggregate views, saved insights and step-connection totals. Connect a PostHog project in the lab to export a suppressed aggregate snapshot. The exported snapshot query selects one export; adding snapshots together would double-count totals. No PostHog browser SDK or individual session recording is enabled. See [ARCHITECTURE.md](ARCHITECTURE.md) for the data flow.
