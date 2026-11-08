# Next Step on Flarum

Extension document hook

## Requirements

- An existing custom Flarum extension and filesystem/deployment access.

## 1. Add the forum document extender

In your extension’s extend.php, add a Frontend content callback. The head entry inserts the classic browser script into the forum document.

File: extend.php

```
<?php
use Flarum\Extend;
use Flarum\Frontend\Document;

return [
  (new Extend\Frontend('forum'))->content(function (Document $document) {
    $document->head[] = '<script src="https://support.example/embed/before.js" data-site="YOUR_INSTALLATION_ID" data-endpoint="https://support.example" defer></script>';
  }),
];
```

## 2. Deploy and clear caches

Enable the custom extension, clear Flarum’s cache with your normal deployment command, and confirm the external script appears in the forum HTML.

## 3. Call from your existing decision handler

Flarum is a single-page app. Use one SDK instance and call it from your extension’s client moderation result handler, rather than rebinding arbitrary inputs after route changes.

File: Client decision handler

```
// Call from your existing moderation decision handler.
await window.Before.intervene({ type: 'search', severity: 'high' });
```

## Integration scope

Manual extension recipe. It requires an extension you own; a native installable Flarum package is not included.

## Documentation

- [Flarum document content extenders](https://docs.flarum.org/1.x/extend/routes/)
- [Flarum Frontend API](https://api.docs.flarum.org/php/2.x/flarum/extend/frontend)
