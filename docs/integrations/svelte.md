# Next Step on SvelteKit

Browser SDK

## Requirements

- Svelte/SvelteKit and access to the client layout or component.

## 1. Install the browser package

Install the downloaded tarball in your Svelte project.

File: Terminal

```
npm install ./before-browser.tgz
```

## 2. Use the mount lifecycle

onMount runs in the browser. Keep its callback synchronous so its returned cleanup runs when the component is destroyed.

File: src/routes/+layout.svelte

```
<script>
  import { onMount } from 'svelte';
  import { createBefore } from '@before/browser';
  let nextStep;
  onMount(() => {
    nextStep = createBefore();
    void nextStep.init({ endpoint: "https://support.example", siteId: "YOUR_INSTALLATION_ID" });
    return () => nextStep.destroy();
  });
  async function onModerationDecision(result) {
    if (result.intervene === true && nextStep) {
      await nextStep.intervene({ type: 'chat', severity: 'high' });
    }
  }
</script>
<slot />
```

## Integration scope

The browser SDK displays the intervention. Your existing moderation system supplies the decision; this guide does not install a production detector.

## Documentation

- [Svelte lifecycle hooks](https://svelte.dev/docs/svelte/lifecycle-hooks)
