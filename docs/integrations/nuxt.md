# Next Step on Nuxt

Browser SDK

## Requirements

- Nuxt 3/4 with access to client plugins.

## 1. Install the browser package

Download and install the local tarball.

File: Terminal

```
npm install ./before-browser.tgz
```

## 2. Add a client-only plugin

For Nuxt 4 use app/plugins; for Nuxt 3 use plugins. The .client suffix keeps browser code out of server rendering.

File: app/plugins/next-step.client.ts

```
import { createBefore } from '@before/browser';

export default defineNuxtPlugin(() => {
  const nextStep = createBefore();
  void nextStep.init({ endpoint: "https://support.example", siteId: "YOUR_INSTALLATION_ID" });
  if (import.meta.hot) import.meta.hot.dispose(() => nextStep.destroy());
  return { provide: { nextStep } };
});
```

## 3. Connect your decision handler

Use the injected client in your existing moderation callback.

File: Client component

```
const { $nextStep } = useNuxtApp();
async function onModerationDecision(result) {
  if (result.intervene === true) {
    await $nextStep.intervene({ type: 'search', severity: 'high' });
  }
}
```

## Integration scope

The browser SDK displays the intervention. Your existing moderation system supplies the decision; this guide does not install a production detector.

## Documentation

- [Nuxt client plugins](https://nuxt.com/docs/4.x/directory-structure/app/plugins)
