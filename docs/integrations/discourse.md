# Next Step on Discourse

Theme component

## Requirements

- Discourse administrator access to theme components and permission to load the service origin.

## 1. Create a theme component

In the theme administration area, create a component, attach it to the active theme, and add the embed to its Head tag. A theme repository can keep it in common/head_tag.html.

File: common/head_tag.html

```
<script src="https://support.example/embed/before.js"
  data-site="YOUR_INSTALLATION_ID" data-endpoint="https://support.example" defer></script>
```

## 2. Allow the service origin

If Discourse’s Content Security Policy blocks the asset or configuration request, allow your owned service origin through the applicable CSP settings. Confirm the script is present in the rendered page.

## 3. Connect your moderation plugin

From your existing plugin or approved client moderation callback, call the initialized SDK. This theme recipe does not add a native search or composer detector.

File: Client moderation callback

```
// Call from your existing moderation decision handler.
await window.Before.intervene({ type: 'search', severity: 'high' });
```

## Integration scope

Manual theme-component integration. A packaged native Discourse adapter is not included; your moderation plugin supplies the decision.

## Documentation

- [Discourse theme script placement](https://meta.discourse.org/t/how-do-i-include-a-javascript-file-into-the-header-or-footer/79778)
- [Theme JavaScript modules](https://github.com/discourse/discourse/blob/main/docs/developer-guides/docs/05-themes-components/07-multiple-js-files.md)
