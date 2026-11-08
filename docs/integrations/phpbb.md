# Next Step on phpBB

Extension template event

## Requirements

- A custom phpBB 3.3 extension and a style that includes the standard template events.

## 1. Use the footer template event

Inside your existing extension, create the event template shown below. overall_footer_after inserts it directly before the closing body tag.

File: styles/all/template/event/overall_footer_after.html

```
<script src="https://support.example/embed/before.js"
  data-site="YOUR_INSTALLATION_ID" data-endpoint="https://support.example" defer></script>
```

## 2. Enable the extension and purge cache

Deploy the extension through your normal phpBB process, enable it in the administrator panel, and purge the board cache after adding the template.

## 3. Connect the existing moderation decision

Use your custom extension’s browser callback to open the intervention when its existing moderation system requests it.

File: Client decision handler

```
// Call from your existing moderation decision handler.
await window.Before.intervene({ type: 'search', severity: 'high' });
```

## Integration scope

Manual phpBB extension integration. The template file alone is not an installable extension and does not add production detection.

## Documentation

- [phpBB template events](https://area51.phpbb.com/docs/dev/3.3.x/extensions/events_list.html)
- [phpBB styles](https://www.phpbb.com/styles/create/)
