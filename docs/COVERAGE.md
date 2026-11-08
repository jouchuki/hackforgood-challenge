# Integration coverage

Sources checked: 8 November 2026. Web adoption figures: 7 November 2026.

Next Step has **four runnable integration paths**, including a browser embed using a technology found on **98.9% of surveyed websites** and a native plugin for the WordPress ecosystem, representing **39.4% of surveyed websites**. These percentages measure technology adoption, not Next Step compatibility. [JavaScript usage](https://w3techs.com/technologies/overview/client_side_language), [WordPress usage](https://w3techs.com/technologies/details/cm-wordpress)

## Measured ecosystem footprint

| Ecosystem | Published figure | Denominator and interpretation |
|---|---:|---|
| JavaScript | 98.9% | Websites in W3Techs’ survey using client-side JavaScript. [Source](https://w3techs.com/technologies/overview/client_side_language) |
| WordPress | 39.4% | All websites in W3Techs’ survey, rather than only sites with an identified CMS. [Source](https://w3techs.com/technologies/details/cm-wordpress) |
| WordPress CMS share | 58.2% | Surveyed websites with an identified content management system; a smaller denominator. [Source](https://w3techs.com/technologies/details/cm-wordpress) |
| Discord | 90M+ daily active users | Discord’s platform-wide figure for Q4 2025, not Next Step’s audience or deployments. [Source](https://discord.com/company) |

W3Techs studies more than 20 million relevant websites. It measures websites rather than pages, traffic or people, groups subdomains with their parent website, and excludes duplicate, empty and redirected sites. Its sample does not represent every form of internet activity. [Survey methodology](https://w3techs.com/technologies)

## Delivered integration breadth

The [catalogue](../content/catalogue.js) contains **23 entries: four runnable paths and 19 platform-specific setup recipes**. Classification uses the catalogue together with the executed checks in the [verification record](VERIFICATION.md).

| Runnable path | Verified boundary |
|---|---|
| JavaScript embed and browser SDK | Built bundle, explicit submission hooks and intervention handover exercised in Chromium. The host supplies the moderation decision. |
| React wrapper | Mounting, cleanup, remounting and a connected synthetic form exercised. Framework-specific recipes are separately classified. |
| WordPress plugin | Installation, activation, deactivation, core search and demo shortcode exercised on WordPress 6.8. Other themes, forms and community plugins need explicit integration. |
| Discord bot | Connected to TEST with registered commands and a synthetic AutoMod rule. The owner confirmed exact-phrase blocking. Complete live help-link and language-button interaction remains a separate check. |

Thirteen framework and hosting recipes cover Next.js, Vue, Nuxt, SvelteKit, Astro, Angular, Express/Node, Django, Laravel, Ruby on Rails, Drupal, Joomla and Tor Browser/onion hosting. A recipe is not an independently verified native adapter; the Tor recipe is not evidence of an executed Tor-network deployment.

Six further recipes cover Discourse, NodeBB, Flarum, phpBB, XenForo and Invision Community through their supported theme or extension mechanisms. These are shared-embed instructions, not claims that six separate native plugins have been packaged or independently verified.

## Interpretation

**The percentage of websites compatible with Next Step has not been measured.** Installation depends on owner control, script and content-security policies, supported submission surfaces and an explicit moderation hook. WordPress installations also need permission to install the plugin. The package does not supply a production detector.

The figures cannot be added: WordPress and React websites commonly also use JavaScript, while framework recipes share the same browser runtime. Catalogue entries count installation paths and guides, not distinct populations of websites. Discord users use a different denominator and cannot be added to a website percentage.

