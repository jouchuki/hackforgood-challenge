=== Next Step Prevention ===
Requires at least: 6.4
Requires PHP: 7.4
Stable tag: 0.2.0
License: MIT

Connect core WordPress search and an explicit [before_demo] shortcode to the self-hosted Before service.

Installation: upload the plugin ZIP, activate, then open Settings > Next Step Prevention. Configure the service origin and installation ID. Local demo defaults: http://localhost:3000 and wordpress. Add [before_demo] to a page.

Synthetic demo matching is enabled explicitly in settings. Disable it before any non-demo use and connect your existing moderation decision. No production detector is included. Other forms, themes, and community plugins require explicit integration.

The core search adapter can redirect on the server even without JavaScript. The original search text is not included in the intervention URL. The plugin does not collect analytics or set visitor cookies; the intervention service's aggregate reporting policy applies.

Deactivate the plugin to remove script injection and search interception. Saved settings remain available for reactivation.
