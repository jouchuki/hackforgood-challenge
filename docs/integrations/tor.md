# Next Step on Tor Browser

Tor/onion deployment

## Requirements

- A running production build of Next Step on loopback port 3000, an installed Tor service, and Nginx. Keep the moderator dashboard local.

## 1. Expose only the public gateway

Add this server block to Nginx’s http configuration. Preserve the onion Host header so Next Step disables location inference. Disable request logging. Run nginx -t before reloading Nginx; keep all other routes private.

File: Nginx public gateway

```
server {
  listen 127.0.0.1:8080;
  access_log off;
  error_log /dev/null crit;
  location = / { return 302 /help; }
  location ~ ^/(help(?:/|$)|intervention(?:/|$)|api/public/|embed/|assets/|brands/|favicon\.svg$) {
    proxy_set_header Host $host;
    proxy_pass http://127.0.0.1:3000;
  }
  location / { return 404; }
}
```

## 2. Publish the public proxy as an onion service

Choose a directory owned by Tor, point the onion service to the public reverse proxy, and restart Tor through your operating system’s service manager.

File: torrc

```
HiddenServiceDir /var/lib/tor/next-step/
HiddenServicePort 80 127.0.0.1:8080
```

## 3. Allow your connected website

After Tor starts, read the public address from /var/lib/tor/next-step/hostname. In the local moderator dashboard, open Install → Platform settings. Add the exact origin of the website loading the embed to Allowed website origins, and set Return page URL to a page on that website. This source origin may differ from the Next Step onion origin; unapproved origins receive HTTP 403.

## 4. Use the onion origin in the embed

Replace YOUR_ONION_HOST with your actual hostname. Allow this origin in your website’s script-src and connect-src if you use a Content Security Policy. Keep country UNKNOWN until the visitor chooses a jurisdiction. The /help link works without JavaScript; intercepting a submission without scripts requires a redirect from your platform’s server.

File: Connected onion website

```
<script src="http://YOUR_ONION_HOST.onion/embed/before.js"
  data-site="YOUR_INSTALLATION_ID" data-endpoint="http://YOUR_ONION_HOST.onion"
  data-country="UNKNOWN" defer></script>
<a href="http://YOUR_ONION_HOST.onion/help?country=UNKNOWN">Find support</a>
```

## 5. Connect your moderation decision

After the script loads, call this from your existing moderation handler. Loading the embed alone does not detect or block submissions. Send only decision metadata, never the original input.

File: Moderation callback

```
// Call from your existing moderation decision handler.
await window.Before.intervene({ type: 'search', severity: 'high' });
```

## Verification

Through Tor Browser, open your onion /help route with JavaScript disabled and select English/Dutch and a country. Then enable scripts, load the embed on your approved website, and call the moderation callback: the published intervention should open. Confirm /moderator/overview, /researcher/studies, /api/session and /api/moderator/sites all return HTTP 404 through the onion proxy. Local HTTP checks do not prove Tor-network connectivity.

## Integration scope

Deployment recipe, not a Tor extension. The browser SDK needs JavaScript; the server-rendered help page does not. A live Tor network installation is not verified by this package.

## Documentation

- [Tor onion service setup](https://community.torproject.org/onion-services/setup/)
- [Tor Browser security levels](https://support.torproject.org/tor-browser/features/security-levels/)
- [Nginx proxy headers](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_set_header)
