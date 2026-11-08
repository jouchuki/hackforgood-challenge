# Next Step on Astro

Browser SDK

## Requirements

- Access to the Astro layout used by the relevant pages.

## 1. Load the classic script in the layout

is:inline leaves the external classic script and its data attributes intact. Mount it once in the shared page layout.

File: src/layouts/Base.astro

```
---
const endpoint = "https://support.example";
---
<html lang="en"><body>
  <slot />
  <script is:inline src={endpoint + '/embed/before.js'}
    data-site="YOUR_INSTALLATION_ID" data-endpoint={endpoint} defer></script>
</body></html>
```

## 2. Connect the browser moderation callback

Call the initialized SDK from your client-side decision handler; no island is needed just to load the classic script.

File: Client decision handler

```
// Call from your existing moderation decision handler.
await window.Before.intervene({ type: 'search', severity: 'high' });
```

## Integration scope

The browser SDK displays the intervention. Your existing moderation system supplies the decision; this guide does not install a production detector.

## Documentation

- [Astro script directives](https://docs.astro.build/en/reference/directives-reference/#isinline)
