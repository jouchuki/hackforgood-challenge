import { createApp } from './app.js';
const port = Number(process.env.PORT || 3001);
const app = createApp({ storePath: process.env.BEFORE_STORE_PATH, gatewayKey: process.env.BEFORE_GATEWAY_KEY, frontendOrigin: process.env.BEFORE_ORIGIN || 'http://localhost:3000' });
const server = app.listen(port, '127.0.0.1', () => {
  process.stdout.write(`Next Step private application ready on loopback port ${port}.\n`);
  // A deployment owner supplies the app token once. Moderator installation then
  // needs only Discord's authorization link; no token crosses the dashboard.
  void app.locals.discord.resume();
});
let closing = false;
function shutdown() {
  if (closing) return;
  closing = true;
  app.locals.discord.close();
  app.locals.discordOAuth?.close();
  server.close();
  server.closeAllConnections?.();
  setTimeout(() => process.exit(0), 500).unref();
}
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
