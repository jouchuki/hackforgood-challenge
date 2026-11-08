# Next Step on Django

Browser SDK

## Requirements

- Access to the base Django template and the client moderation handler.

## 1. Add the script to base.html

Load it once in the parent template inherited by connected pages. No Python dependency is required for the browser embed.

File: templates/base.html

```
<!doctype html>
<html lang="en"><body>
  {% block content %}{% endblock %}
  <script src="https://support.example/embed/before.js"
  data-site="YOUR_INSTALLATION_ID" data-endpoint="https://support.example" defer></script>
  {% block scripts %}{% endblock %}
</body></html>
```

## 2. Handle the moderation result

Call this in the browser after your existing Python moderation endpoint returns a decision. Keep the original input within your own application.

File: Client decision handler

```
// Call from your existing moderation decision handler.
await window.Before.intervene({ type: 'search', severity: 'high' });
```

## Integration scope

The browser SDK displays the intervention. Your existing moderation system supplies the decision; this guide does not install a production detector.

## Documentation

- [Django template inheritance](https://docs.djangoproject.com/en/stable/ref/templates/language/#template-inheritance)
