# Next Step on JavaScript

Script embed

## Requirements

- Access to your website layout and its Content Security Policy.

## 1. Add the script

Put this once in the shared HTML layout before the closing body tag. Allow the configured service origin in script-src and connect-src if your site uses a Content Security Policy.

File: Shared layout

```
<script src="https://support.example/embed/before.js"
  data-site="YOUR_INSTALLATION_ID" data-endpoint="https://support.example" defer></script>
```

## 2. Connect your moderation decision

When your existing detector decides to intervene, call the SDK with metadata. Do not put the original search or message in this call.

File: Moderation callback

```
// Call from your existing moderation decision handler.
await window.Before.intervene({ type: 'search', severity: 'high' });
```

## Integration scope

The browser SDK displays the intervention. Your existing moderation system supplies the decision; this guide does not install a production detector.

## Documentation

- [Script loading](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script)
