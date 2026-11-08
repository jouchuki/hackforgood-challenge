# Next Step presentation sources

The presentation contains exactly four slides and exports to `output/pdf/next-step-key-ideas.pdf`.

## External facts

- IWF Annual Data & Insights Report 2024, reports assessment: https://www.iwf.org.uk/annual-data-insights-report-2024/data-and-insights/reports-assessment/
  - 291,273 confirmed reports in 2024 contained, linked to, or advertised criminal imagery of child sexual abuse.
  - Each report represents a URL or a report through child reporting services. This is neither a victim count nor a global prevalence estimate.
- IWF reThink chatbot evaluation: https://www.iwf.org.uk/about-us/why-we-exist/our-research/rethink-chatbot-evaluation/
  - The IWF summary reports 2.8 million chatbot displays from March 2022 to August 2023 and 490 click-throughs to the Stop It Now website.
  - The underlying evaluation PDF uses a different end-month label for the display window and distinguishes some session and user measures. The slides use the public IWF summary's wording and dates, and do not calculate a conversion rate or imply unique people.
  - These are reThink figures, not results from Next Step. Next Step's sequence is a design hypothesis and its efficacy has not been established.

## Product evidence

- `DESIGN.md`, `app/brand.js`, and the parent agent's verified implementation and deployment report.
- `.before/qa/hosted/builder.png` and `.before/qa/hosted/lab.png`, cropped without distortion. The research data is synthetic and the slide discloses this.
- Four tested installation paths are browser embed, React wrapper, WordPress plugin (WordPress 6.8), and a real Discord bot in the owned test server.
- Nineteen other platform-specific setup recipes are distinguished from verified installations.

## OpenDesign provenance

OpenDesign https://github.com/nexu-io/open-design revision `87a4f91c308170a8270458fc40fc66a86ed69aac` was cloned to `/tmp/next-step-open-design` and consulted for this artifact.

Applied references: `skills/frontend-design/SKILL.md`, `skills/impeccable-design-polish/SKILL.md`, `skills/deck-open-slide-canvas/SKILL.md`, `design-systems/warm-editorial/DESIGN.md`, and `craft/{typography,color,anti-ai-slop}.md`. The project-specific ivory and forest palette and Newsreader / DM Sans pairing take priority. The result uses a fixed 1920 by 1080 canvas, editorial typography, restrained color, and flat compositions instead of UI cards. HTML is a local PDF authoring source rather than a new app surface.

## Reproduction

Run `node submission/presentation/render-pdf.mjs` after installing repository dependencies. It uses system Chrome at `/opt/google/chrome/chrome`. Render the exported PDF with Poppler for visual review.
