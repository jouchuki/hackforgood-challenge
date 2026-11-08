# Next Step on Invision Community

Custom theme integration

## Requirements

- Theme/developer access that permits custom JavaScript. The integration point differs between Community 4 and 5.

## 1. Choose the supported theme hook

Community 4 can insert this script in a custom globalTemplate or included template bit. Community 5 uses its custom-template and hook system; direct editing of the stock template is not available there.

File: Custom template / theme hook

```
<script src="https://support.example/embed/before.js"
  data-site="YOUR_INSTALLATION_ID" data-endpoint="https://support.example" defer></script>
```

## 2. Load it on the relevant pages

Ask your theme developer to place the markup once in the supported page hook. Confirm your hosted plan permits this customization and that the service origin passes the page’s CSP.

## 3. Connect the moderation callback

Call the browser SDK from the client result handler of your existing moderation application.

File: Client decision handler

```
// Call from your existing moderation decision handler.
await window.Before.intervene({ type: 'search', severity: 'high' });
```

## Integration scope

Version-specific manual theme recipe. No native Invision application is bundled; hosted plans must allow the required theme customization.

## Documentation

- [Invision 4 custom template bits](https://invisioncommunity.com/news/community-management/theme-tip-using-custom-template-bits-r965/)
- [Invision 5 theme tools](https://invisioncommunity.com/developers/devblog/blog/ic5-theme-tools-r14/)
