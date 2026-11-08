# Next Step on Vue

Browser SDK

## Requirements

- Vue 3 and a JavaScript module build.

## 1. Install the browser package

Download the tarball and install it in your Vue app.

File: Terminal

```
npm install ./before-browser.tgz
```

## 2. Initialize and clean up

Keep one SDK instance in the component responsible for moderation. Initialize on mount and dispose on unmount.

File: NextStep.vue

```
<script setup>
import { onMounted, onBeforeUnmount } from 'vue';
import { createBefore } from '@before/browser';
const nextStep = createBefore();
onMounted(() => nextStep.init({ endpoint: "https://support.example", siteId: "YOUR_INSTALLATION_ID" }));
onBeforeUnmount(() => nextStep.destroy());
async function onModerationDecision(result) {
  if (result.intervene === true) {
    await nextStep.intervene({ type: 'chat', severity: 'high' });
  }
}
defineExpose({ onModerationDecision });
</script>
```

## Integration scope

The browser SDK displays the intervention. Your existing moderation system supplies the decision; this guide does not install a production detector.

## Documentation

- [Vue lifecycle hooks](https://vuejs.org/api/composition-api-lifecycle.html)
