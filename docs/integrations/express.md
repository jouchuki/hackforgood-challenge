# Next Step on Express / Node

Browser SDK

## Requirements

- An Express app that renders browser HTML, with access to its shared template.

## 1. Add the embed to your view

In an EJS layout, place the script before the closing body tag. Use the same approach in Pug or Handlebars with the equivalent script attributes.

File: views/layout.ejs

```
<script src="https://support.example/embed/before.js"
  data-site="YOUR_INSTALLATION_ID" data-endpoint="https://support.example" defer></script>
```

## 2. Connect the result in the browser

When the client receives a moderation decision from your Node service, call the browser SDK. The package is not Express middleware and should not be initialized on the server.

File: Client moderation callback

```
async function applyModerationResult(result) {
  if (result.intervene === true) {
    await window.Before.intervene({ type: 'chat', severity: 'high' });
    return;
  }
  // Continue your normal allowed-submission flow.
}
```

## Integration scope

The browser SDK displays the intervention. Your existing moderation system supplies the decision; this guide does not install a production detector.

## Documentation

- [Express template engines](https://expressjs.com/en/guide/using-template-engines/)
