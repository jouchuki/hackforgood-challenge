# Next Step on Laravel

Browser SDK

## Requirements

- Access to the main Blade layout and your existing moderation callback.

## 1. Add the script to Blade

Use a layout so the SDK is loaded once on each connected page. If your application uses Livewire or client navigation, keep one SDK instance across the navigation lifecycle.

File: resources/views/layouts/app.blade.php

```
<!doctype html>
<html lang="en"><body>
  @yield('content')
  <script src="https://support.example/embed/before.js"
  data-site="YOUR_INSTALLATION_ID" data-endpoint="https://support.example" defer></script>
  @stack('scripts')
</body></html>
```

## 2. Use the existing moderation response

From the browser callback receiving your Laravel moderation decision, open the published journey using metadata only.

File: Client decision handler

```
// Call from your existing moderation decision handler.
await window.Before.intervene({ type: 'search', severity: 'high' });
```

## Integration scope

The browser SDK displays the intervention. Your existing moderation system supplies the decision; this guide does not install a production detector.

## Documentation

- [Blade layouts and stacks](https://laravel.com/docs/12.x/blade)
