# Next Step on WordPress

WordPress plugin

## Requirements

- WordPress administrator access with permission to upload plugins.

## 1. Upload and activate

Download the ZIP. In WordPress open Plugins → Add New Plugin → Upload Plugin, select the ZIP, install it and activate Next Step Prevention.

## 2. Connect the published message

Open Settings → Next Step Prevention. Set the service endpoint and site ID shown below. Add your WordPress website origin to the installation’s allowed origins.

File: Plugin settings

```
Service endpoint: https://support.example
Site ID: YOUR_INSTALLATION_ID

Shortcode for a connection-test page:
[before_demo]
```

## 3. Verify a real submission

With the plugin’s test mode enabled, add the shortcode to a page or use the core search form and submit test-trigger-red. The plugin includes a server-side search fallback as well as the browser handover.

## Integration scope

The shipped plugin connects WordPress core search and its shortcode. Other form plugins need an explicit adapter. Test mode recognizes synthetic examples; production detection remains external.

## Documentation

- [Installing WordPress plugins](https://wordpress.org/documentation/article/manage-plugins/)
