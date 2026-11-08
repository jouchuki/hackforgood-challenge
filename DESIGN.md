# Stop Before It Starts design system

The frontend uses Open Design's frontend-design workflow and Warm Editorial design system as its starting point. This project-specific adaptation is the active design contract.

## Direction

A humane prevention workspace: warm paper, forest green, generous editorial typography, precise operational controls. The moderator and researcher portal should feel like a well-made research instrument. The intervention should feel quiet, respectful, and easy to leave or navigate to help.

## Colour

- Background: #F8F7F3.
- Surface: #FFFEFA.
- Foreground: #26382F.
- Muted text: #627067.
- Primary action: #244D3D.
- Active surface: #E8EEE6.
- Border: #DCE1D8.
- Warm supporting surface: #EFE9DD.
- Status: #50653B; warning: #775B23.

Use colour to communicate state. Avoid gradients, glass effects, decorative glow, and alarm-red intervention pages.

## Typography

Newsreader Variable for editorial headings and large numbers. DM Sans Variable for navigation, forms, tables, and body text. Fonts are bundled and served locally. Display sizes 40–64px, section headings 24–32px, body 15–17px, metadata 12–13px. Body line-height 1.5–1.65. Display tracking -0.025em. Use no more than three principal font weights.

## Layout and components

Desktop portal: 224px sidebar, compact header, content up to 1440px, 32–48px page padding. Panels use fine borders and 12–18px corners. Prefer generous space within meaningful groups over many nested cards. Controls have visible labels, clear focus rings, and comfortable touch targets. Tables may scroll inside their own region on small screens; the page must not overflow.

The intervention uses a full page, a constrained reading column, a clear stage indicator, and a help action available at every stage. Do not require a timed wait. Do not claim to know the visitor's identity, behaviour history, or mental state.

## Interaction

Navigation, editing, preview, publication, automatic experiment assignment, pausing, synthetic traffic generation, and installation copying must work. Use short opacity/position transitions for state changes, with reduced-motion support. No ambient animation in the workspace.

## Product truth

All dashboard traffic is labelled synthetic. Research comparisons are demonstrations, not evidence of efficacy. The reflection-first sequence is an experimental hypothesis. Browser, React and WordPress integrations are tested locally. The real Discord bot is connected to the owned test server and managed by the application. Dashboard setup enables the test rule and requires actual protection readback before Ready; owner credentials are configured once. A separate shared-handler simulator remains unlisted. Other catalogue entries distinguish framework recipes from planned native adapters. The owned gateway can estimate country transiently using a local database without retaining the address; visitors can correct that estimate. Production detection is external. Content packs expose their review status; never claim automatic legal verification, live legal updates or clinical outcomes.

## Provenance

Open Design: https://github.com/nexu-io/open-design, revision 87a4f91c308170a8270458fc40fc66a86ed69aac. Consulted skills/frontend-design/SKILL.md, skills/impeccable-design-polish/SKILL.md, design-systems/warm-editorial/DESIGN.md, and craft guidance on typography, colour, accessibility, animation, and avoiding generic output. The forest palette, fonts, dashboard proportions, and sentence-case headings are intentional adaptations. Open Design is a design-time reference, not a runtime dependency.

## Clarity pass

Workspace headings name the task. Moderator screens prioritise installation, message publication and outcomes. The research composer uses setup, message and review steps, with stage-aware editing and separate results. Advanced configuration stays collapsed until needed. Research engagement measures stay visible alongside outcome comparisons. Repeated measurement and demonstration explanations live behind accessible SVG information buttons. The unlisted Discord rehearsal is reachable only through its direct URL.

## Next Step and independent surfaces

The product is named Next Step. Moderator views handle message authoring, installation and country content only. Study design, platform participation and analytics belong to researchers. New study comparisons use automatic even assignment without allocation controls. MySmall20kUserForum and Fieldnotes are independent community examples with their own visual identities. Intervention presets intentionally differ: a plain white legal document with inline support, the calm ivory and forest reading journey, and an ink and amber values-focused editorial treatment.
