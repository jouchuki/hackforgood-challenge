# Next Step on NodeBB

HTML widget or custom theme

## Requirements

- NodeBB administrator access and an HTML widget area or a custom theme you control.

## 1. Add a trusted HTML widget

Use the HTML widget supplied by the widget system in a header or footer area exposed by your active theme. Include it on every route where the intervention is needed.

File: Administrator HTML widget

```
<script src="https://support.example/embed/before.js"
  data-site="YOUR_INSTALLATION_ID" data-endpoint="https://support.example" defer></script>
```

## 2. Alternatively use a custom theme

For a maintained code deployment, add the same script to your custom theme’s footer template, then rebuild NodeBB assets and restart through your normal deployment procedure.

## 3. Connect your plugin’s decision

Call the SDK in the browser after your existing NodeBB moderation plugin returns a decision. No new server event hook or input detector is installed by this widget.

File: Client decision handler

```
// Call from your existing moderation decision handler.
await window.Before.intervene({ type: 'search', severity: 'high' });
```

## Integration scope

Manual widget/theme integration. This package does not ship a native NodeBB plugin.

## Documentation

- [NodeBB widgets](https://github.com/NodeBB/NodeBB/wiki/Widgets-System)
- [NodeBB custom themes](https://docs.nodebb.org/development/themes/)
