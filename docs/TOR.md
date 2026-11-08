# Tor and low-script compatibility

The standard browser integration works when JavaScript is enabled. Stronger Tor Browser security settings may disable scripts. The server-rendered `http://localhost:3000/help` page provides language and country selection and links without JavaScript. A script-only adapter cannot intercept submissions with scripts disabled; the WordPress core-search adapter can redirect on the server.

An onion deployment is optional. Follow the complete [Tor deployment guide](integrations/tor.md). Configure Tor to forward to the owned public-only proxy on port 8080, not directly to the full dashboard gateway on port 3000. For example:

```text
HiddenServiceDir /path/owned-by-tor/before/
HiddenServicePort 80 127.0.0.1:8080
```

Before exposing it, restrict the onion proxy to public intervention/help/config/metrics and required static assets. Do not expose moderator, researcher, session, or demo-control routes. Preserve the incoming onion Host header when proxying; Nginx otherwise replaces it with the upstream address. Disable request and error logging in that proxy. Add the connected website's exact origin to the installation's allowed origins and configure its return URL from the local moderator dashboard. The embed still needs an explicit moderation callback; it does not install detection. Keep all fonts, icons and scripts local. Keep country unknown and allow explicit choice; an exit relay is not the visitor's location.

The local package does not install Tor, publish an onion service, monitor Tor traffic, identify Tor visitors or modify their browser. A generic no-JavaScript test is not an end-to-end Tor-network verification.

Sources: [Tor security levels](https://support.torproject.org/tor-browser/features/security-levels/), [onion-service setup](https://community.torproject.org/onion-services/setup/).
