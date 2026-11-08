# Next Step on Ruby on Rails

Ruby on Rails layout

## Requirements

- Access to application.html.erb and the JavaScript or Stimulus moderation callback.

## 1. Include the script in the Rails layout

Add this to app/views/layouts/application.html.erb. Rails renders the data attributes; the SDK runs in the visitor’s browser. No Ruby gem is required.

File: app/views/layouts/application.html.erb

```
<%= javascript_include_tag "https://support.example/embed/before.js",
  defer: true,
  data: { site: "YOUR_INSTALLATION_ID", endpoint: "https://support.example", turbo_track: 'reload' } %>
```

## 2. Call the SDK from your moderation handler

In your existing Stimulus action or JavaScript response handler, call this function after the Rails endpoint returns an intervene decision. Do not pass message text or account IDs.

File: app/javascript/moderation/next_step.js

```
export async function handleModerationDecision(result) {
  if (result.intervene === true) {
    await window.Before.intervene({ type: 'chat', severity: 'high' });
  }
}
```

## 3. Check Turbo navigation

Load the SDK once in the shared layout. After Turbo navigation, call the same global instance instead of adding another script for each partial.

## Integration scope

The browser SDK displays the intervention. Your existing moderation system supplies the decision; this guide does not install a production detector.

## Documentation

- [Rails layouts](https://guides.rubyonrails.org/layouts_and_rendering.html)
- [Rails JavaScript asset helpers](https://api.rubyonrails.org/classes/ActionView/Helpers/AssetTagHelper.html)
