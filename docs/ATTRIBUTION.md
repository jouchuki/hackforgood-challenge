# Sources and attribution

The interface uses the Open Design collection as design-time guidance: frontend-design, impeccable-design-polish, ui-animation and craft references at revision `87a4f91c308170a8270458fc40fc66a86ed69aac`. [Open Design repository](https://github.com/nexu-io/open-design). The project's adapted direction is recorded in `DESIGN.md`; the Open Design application and telemetry are not runtime dependencies.

DM Sans and Newsreader are served from installed Fontsource packages. Their upstream font licences are bundled in `public/licenses/` and copied into the built site. No Google Fonts runtime request is made.

Official platform favicons were downloaded once for catalogue identification. Sources and retrieval metadata are in `public/brands/provenance.json`. Brand rights belong to their respective owners; catalogue inclusion is not endorsement. Missing assets use original local monograms. No visitor request goes to a favicon provider.

Country lookup optionally uses the locally downloaded [DB-IP Lite database](https://db-ip.com/db/download/ip-to-country-lite), licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Runtime country pages link to DB-IP. Download metadata is stored locally; no visitor IP is sent to DB-IP.

Help resources and initial legal content originate in the challenge's `data/` directory and linked sources. Dutch law: [Openbaar Ministerie](https://www.om.nl/onderwerpen/b/beleidsregels/aanwijzingen/jeugd---gezin---zeden/aanwijzing-kinderpornografie-2024a006). Service availability and confidentiality are governed by each independent service. Unreviewed country content remains unavailable or explicitly needs verification.

The plain legal preset’s Netherlands-only enforcement paragraph was checked on 8 November 2026 against the [Dutch police report of 23 May 2024](https://www.politie.nl/nieuws/2024/mei/23/huiszoeking-na-aantreffen-kinderpornografie.html) and [prosecution guidance](https://www.om.nl/onderwerpen/b/beleidsregels/aanwijzingen/jeugd---gezin---zeden/aanwijzing-kinderpornografie-2024a006). It describes a documented investigative capability, without claiming that a current visitor is identified or reported. Copy and source metadata are in `content/legal-notices.js`.
