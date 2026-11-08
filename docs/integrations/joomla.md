# Next Step on Joomla

Joomla Web Asset Manager

## Requirements

- Access to a custom template or extension using Joomla’s Web Asset Manager.

## 1. Register the external asset

Add this to your controlled template or extension. The attributes are emitted on the script tag; register it once per document.

File: Template or extension PHP

```
<?php
use Joomla\CMS\Factory;
$wa = Factory::getApplication()->getDocument()->getWebAssetManager();
$wa->registerAndUseScript('next-step.widget', "https://support.example/embed/before.js", [], [
  'defer' => true,
  'data-site' => "YOUR_INSTALLATION_ID",
  'data-endpoint' => "https://support.example",
]);
```

## 2. Connect the submission decision

Call the SDK from your extension’s browser handler after your existing moderation service requests an intervention.

File: Client decision handler

```
// Call from your existing moderation decision handler.
await window.Before.intervene({ type: 'search', severity: 'high' });
```

## Integration scope

The browser SDK displays the intervention. Your existing moderation system supplies the decision; this guide does not install a production detector.

## Documentation

- [Joomla Web Asset Manager](https://manual.joomla.org/docs/general-concepts/web-asset-manager/)
- [Adding JavaScript](https://manual.joomla.org/docs/general-concepts/javascript/adding-javascript/)
