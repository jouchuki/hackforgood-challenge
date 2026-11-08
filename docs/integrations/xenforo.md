# Next Step on XenForo

Style template integration

## Requirements

- XenForo administrator access to a custom style or add-on template modifications.

## 1. Add the script to the page container

In your custom style, insert the script before the closing body tag in PAGE_CONTAINER. A maintained add-on can apply the same insertion with a template modification.

File: PAGE_CONTAINER

```
<script src="https://support.example/embed/before.js"
  data-site="YOUR_INSTALLATION_ID" data-endpoint="https://support.example" defer></script>
```

## 2. Confirm the modification applies

Keep the change in your custom style/add-on rather than core files. Check the template modification result and rendered page after XenForo upgrades.

## 3. Connect your moderation add-on

From the browser response handler of your existing moderation add-on, call the SDK with the decision metadata.

File: Client decision handler

```
// Call from your existing moderation decision handler.
await window.Before.intervene({ type: 'search', severity: 'high' });
```

## Integration scope

Manual style/add-on integration. No native XenForo add-on is bundled.

## Documentation

- [XenForo templates](https://docs.xenforo.com/manual/appearance/theming/templates)
- [XenForo template modifications](https://docs.xenforo.com/manual/appearance/theming/template-modifications)
