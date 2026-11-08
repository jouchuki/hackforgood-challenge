import http from 'node:http';
import net from 'node:net';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';
import { open } from 'maxmind';
import { createHash, timingSafeEqual } from 'node:crypto';

const sensitiveHeaders = new Set(['forwarded', 'x-real-ip', 'x-client-ip', 'client-ip', 'true-client-ip', 'cf-connecting-ip', 'cf-connecting-ipv6', 'fastly-client-ip', 'referer', 'referrer', 'x-before-gateway-key', 'x-before-country', 'x-before-country-source', 'x-before-geo-status']);

export function cleanHeaders(headers) {
  return Object.fromEntries(Object.entries(headers).filter(([name]) => !sensitiveHeaders.has(name.toLowerCase()) && !name.toLowerCase().startsWith('x-forwarded-') && !name.toLowerCase().startsWith('x-before-')));
}

export async function createGateway({ gatewayKey = process.env.BEFORE_GATEWAY_KEY, mode = process.env.BEFORE_MODE || 'development', apiPort = Number(process.env.BEFORE_API_PORT || 3001), vitePort = Number(process.env.VITE_PORT || 3002), databasePath = process.env.BEFORE_COUNTRY_DB || resolve('.before/country.mmdb'), countryReader, adminUsername = process.env.BEFORE_ADMIN_USERNAME || 'admin', adminPassword = process.env.BEFORE_ADMIN_PASSWORD || '' } = {}) {
  if (!gatewayKey || gatewayKey.length < 16) throw new Error('A private BEFORE_GATEWAY_KEY of at least 16 characters is required.');
  if (adminPassword && adminPassword.length < 16) throw new Error('Use an administration password of at least 16 characters.');
  const digest = value => createHash('sha256').update(value).digest();
  const expectedAuthorization = adminPassword ? digest(`${adminUsername}:${adminPassword}`) : null;
  let reader = null;
  if (!countryReader && existsSync(databasePath)) {
    try { reader = await open(databasePath); } catch { /* Unknown country is a usable fallback; never print request/database content. */ }
  }
  const lookup = countryReader || (ip => reader?.get(ip)?.country?.iso_code || 'UNKNOWN');
  const geoStatus = countryReader || reader ? 'ready' : 'unavailable';

  const server = http.createServer((req, res) => {
    const path = req.url?.split('?')[0] || '/';
    const applicationRoute = mode === 'production' || path === '/help' || path.startsWith('/api/') || path === '/embed/before.js' || path.startsWith('/downloads/');
    const targetPort = applicationRoute ? apiPort : vitePort;
    const incomingHost = String(req.headers.host || '').split(':')[0].toLowerCase();
    const onion = incomingHost.endsWith('.onion');
    if (onion && path === '/') {
      res.writeHead(302, { Location: '/help', 'Referrer-Policy': 'no-referrer' }); res.end(); return;
    }
    if (onion && (/^\/(moderator|researcher|demo)(\/|$)/.test(path) || /^\/api\/(session|moderator|researcher|presenter)(\/|$)/.test(path))) {
      res.writeHead(404, { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' }); res.end('Not found'); return;
    }
    const ownerRoute = /^\/(moderator|researcher)(\/|$)/.test(path) || /^\/api\/(session|moderator|researcher|presenter)(\/|$)/.test(path) || /^\/demo\/control(\/|$)/.test(path);
    if (expectedAuthorization && ownerRoute) {
      const authorization = String(req.headers.authorization || '');
      const supplied = authorization.startsWith('Basic ') ? Buffer.from(authorization.slice(6), 'base64').toString('utf8') : '';
      if (!timingSafeEqual(digest(supplied), expectedAuthorization)) {
        res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="Next Step dashboard", charset="UTF-8"', 'Content-Type': 'text/plain', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' });
        res.end('Sign in to open the dashboard.'); return;
      }
    }
    let country = 'UNKNOWN';
    if (!onion) {
      try {
        const remote = req.socket.remoteAddress || '';
        const address = remote.startsWith('::ffff:') ? remote.slice(7) : remote;
        const value = lookup(address);
        if (typeof value === 'string' && /^[A-Z]{2}$/.test(value)) country = value;
      } catch { /* No IP is retained or emitted when lookup fails. */ }
    }
    const headers = {
      ...cleanHeaders(req.headers),
      'x-before-gateway-key': gatewayKey,
      'x-before-country': country,
      'x-before-country-source': onion ? 'tor' : country === 'UNKNOWN' ? 'unknown' : 'ip',
      'x-before-geo-status': geoStatus,
    };
    if (expectedAuthorization) delete headers.authorization;
    let targetPath = req.url;
    if (!applicationRoute) {
      const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
      if (/^\/intervention\/[^/]+\/?$/.test(path)) targetPath = `/intervention/index.html${query}`;
      else if (/^\/demo\/(forum|fieldnotes|discord|control)\/?$/.test(path)) targetPath = `/demo/index.html${query}`;
    }
    const upstream = http.request({ hostname: '127.0.0.1', port: targetPort, path: targetPath, method: req.method, headers }, response => {
      const responseHeaders = { ...response.headers, 'referrer-policy': 'no-referrer', 'x-content-type-options': 'nosniff' };
      delete responseHeaders['x-powered-by'];
      res.writeHead(response.statusCode || 502, responseHeaders);
      response.pipe(res);
    });
    upstream.on('error', () => {
      if (!res.headersSent) res.writeHead(502, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify({ error: 'The local service is not ready. Start the application and try again.', code: 'service_unavailable' }));
    });
    req.on('aborted', () => upstream.destroy());
    req.pipe(upstream);
  });

  // Vite HMR uses the same owned gateway. No visitor metadata is logged.
  server.on('upgrade', (req, socket, head) => {
    if (mode !== 'development') { socket.destroy(); return; }
    const upstream = net.connect(vitePort, '127.0.0.1', () => {
      const headers = cleanHeaders(req.headers);
      const lines = Object.entries(headers).flatMap(([name, value]) => Array.isArray(value) ? value.map(item => `${name}: ${item}`) : [`${name}: ${value}`]);
      upstream.write(`${req.method} ${req.url} HTTP/${req.httpVersion}\r\n${lines.join('\r\n')}\r\n\r\n`);
      if (head.length) upstream.write(head);
      socket.pipe(upstream); upstream.pipe(socket);
    });
    upstream.on('error', () => socket.destroy());
    socket.on('error', () => upstream.destroy());
    socket.on('close', () => upstream.destroy());
  });
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const server = await createGateway();
  const port = Number(process.env.PORT || 3000);
  server.listen(port, '127.0.0.1', () => process.stdout.write(`Next Step owned gateway ready on loopback port ${port}. Request logging is disabled.\n`));
}
