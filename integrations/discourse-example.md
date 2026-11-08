# Discourse integration recipe

Status: planned native adapter. This guide is not evidence of a tested Discourse plugin.

The shared browser package can be included by a site operator through a permitted theme component. Connect only a supported search/composer submission hook verified against the installed Discourse version; do not rely on typing events or undocumented hook names.

```html
<script src="https://YOUR-OWNED-SERVICE/embed/before.js"
        data-site="YOUR-PUBLIC-INSTALLATION-ID"
        data-endpoint="https://YOUR-OWNED-SERVICE"
        defer></script>
```

The native adapter receives a platform moderation decision and invokes the shared metadata contract:

```js
document.body.dispatchEvent(new CustomEvent('sbis:trigger', {
  detail: { type: 'search', severity: 'high', country: 'NL', language: 'en' }
}));
```

The installation origin must be allowed by the service. Do not forward the submitted query or post body. Demo matching uses only `test-trigger-*` examples. The prevention module is not a production detector.

Before claiming native support, install an actual theme/plugin against a pinned Discourse version and verify normal submissions, synthetic matches, navigation lifecycle, deactivation, configured return pages and aggregate outcomes. Until then, use the catalogue's Planned status and the generic browser SDK only where custom scripts and explicit hooks are available.
