# Next Step on Drupal

Drupal asset library

## Requirements

- A custom theme or module with permission to define asset libraries.

## 1. Define an external script library

Add the library to your own theme; replace my_theme with the machine name of that theme.

File: my_theme.libraries.yml

```
next_step:
  js:
    https://support.example/embed/before.js:
      type: external
      attributes:
        defer: true
        data-site: 'YOUR_INSTALLATION_ID'
        data-endpoint: 'https://support.example'
```

## 2. Attach the library

Attach it from the theme’s info file for every page, or use attach_library in the Twig template for only the relevant page. Rebuild Drupal caches after changing asset definitions.

File: my_theme.info.yml

```
libraries:
  - my_theme/next_step
```

## 3. Connect a Drupal moderation callback

Call the initialized SDK from your custom module’s client behavior when its existing moderation result requests an intervention.

File: Client decision handler

```
// Call from your existing moderation decision handler.
await window.Before.intervene({ type: 'search', severity: 'high' });
```

## Integration scope

The browser SDK displays the intervention. Your existing moderation system supplies the decision; this guide does not install a production detector.

## Documentation

- [Drupal asset libraries](https://www.drupal.org/docs/develop/creating-modules/adding-assets-css-js-to-a-drupal-module-via-librariesyml)
