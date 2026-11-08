import { buildReply, parseButton, shortWarning } from '../integrations/discord/handlers.js';
import { installSyntheticRule } from '../integrations/discord/adapter.js';
import { icon } from './icons.js';
import { infoButton, openInfoDialog } from './disclosure.js';
import { escapeHtml as esc } from '../core/model.js';
import './discord-demo.css';

export async function mountDiscordDemo(root, { endpoint = location.origin, siteId = 'demo-forum' } = {}) {
  let language = 'en';
  let action = 'reflection';
  let setupState;
  let moderator = false;
  let ruleInstalled = false;
  let ready = false;
  let config = { publicOrigin: endpoint, allowLocalLinks: true, siteId, country: 'NL' };
  document.title = 'Discord rehearsal — Next Step';
  const syntheticGuild = {
    members: { me: { permissions: { has: () => true } } },
    autoModerationRules: {
      fetch: async () => ({ find: predicate => ruleInstalled && predicate({ name: 'Before · synthetic prevention demo', creatorId: 'simulated-bot' }) ? { name: 'Before · synthetic prevention demo' } : undefined }),
      create: async () => { ruleInstalled = true; return { name: 'Before · synthetic prevention demo' }; },
    },
  };
  const markdown = value => esc(value).replace(/\n/g, '<br>');

  function renderMessage() {
    const payload = buildReply({ action, language, config, setupState });
    const embed = payload.embeds[0];
    return `<article class="discord-bot-message"><span class="discord-avatar">ns</span><div class="discord-message-body"><div class="discord-author"><strong>Next Step</strong><span>APP</span>${infoButton('discord-message', language === 'nl' ? 'Over dit antwoord' : 'About this reply')}</div><div class="discord-embed"><h2>${esc(embed.title)}</h2><p>${markdown(embed.description)}</p></div><div class="discord-components">${payload.components.map(row => `<div class="discord-button-row">${row.components.map(component => component.style === 5 ? `<a class="discord-button link" href="${esc(component.url)}" target="_blank" rel="noopener noreferrer">${esc(component.label)} ${icon('external', 13)}</a>` : `<button class="discord-button ${component.style === 1 ? 'primary' : ''}" data-native-action="${esc(component.custom_id)}">${esc(component.label)}</button>`).join('')}</div>`).join('')}</div><p class="discord-private">${icon('eye', 12)} ${language === 'nl' ? 'Alleen voor jou zichtbaar' : 'Only visible to you'}</p></div></article>`;
  }

  function render() {
    root.innerHTML = `<main class="discord-demo-shell"><nav class="demo-nav" aria-label="Rehearsal navigation"><span class="demo-site-brand">${icon('message', 27)} Discord rehearsal</span><div class="demo-nav-actions"><a class="text-link" href="${endpoint}/moderator/docs/discord">Bot setup ${icon('arrow', 15)}</a>${infoButton('discord','About this preview')}</div></nav><header class="discord-demo-heading"><div><h1>Support inside the conversation.</h1><p>Try the bot’s messages and support buttons.</p></div><div class="discord-connection"><span class="discord-status-dot"></span><strong>Local preview</strong><small>${ready ? 'Published message loaded' : 'Default message loaded'}</small></div></header><div class="discord-layout"><aside class="discord-controls"><h2>Try an interaction</h2><label>Interface language<select id="discord-language"><option value="en" ${language === 'en' ? 'selected' : ''}>English</option><option value="nl" ${language === 'nl' ? 'selected' : ''}>Nederlands</option></select></label><label>Role<select id="discord-role"><option value="member" ${!moderator ? 'selected' : ''}>Community member</option><option value="moderator" ${moderator ? 'selected' : ''}>Server moderator</option></select></label><div class="discord-command-list"><button data-command="demo">${icon('play', 16)}<span><strong>/before demo</strong><small>A reflection-first interaction</small></span>${icon('chevron', 15)}</button><button data-command="support">${icon('heart', 16)}<span><strong>/before support</strong><small>Go directly to professional help</small></span>${icon('chevron', 15)}</button><button data-command="setup">${icon('shield', 16)}<span><strong>/before setup</strong><small>Moderator-only test rule</small></span>${icon('chevron', 15)}</button></div><div class="discord-synthetic-test"><span class="eyebrow">TEST MESSAGE</span><code>test-trigger-red</code><button class="button small" id="synthetic-block">Try test message</button><p id="synthetic-block-result" role="status">${ruleInstalled ? 'Test rule enabled.' : 'Choose Server moderator and run /before setup.'}</p></div></aside><section class="discord-window" aria-label="Discord conversation preview"><header class="discord-channel"><span># prevention-demo</span><small>Private test server</small></header><div class="discord-chat"><div class="discord-command-invocation"><span class="discord-member-avatar">S</span><div><strong>Test member</strong><p>/${action === 'setup' ? 'before setup' : action === 'support' ? 'before support' : 'before demo'}</p></div></div><div id="discord-current-message" aria-live="polite">${renderMessage()}</div></div></section></div><footer class="demo-footer"><a class="text-link" href="${endpoint}/downloads/before-discord.zip">Download bot package ${icon('download', 14)}</a></footer></main>`;
    root.querySelector('[data-info="discord"]').onclick = () => openInfoDialog({title:'About this preview',body:'<p>This unlisted rehearsal runs the same interaction handlers as the real Discord bot without connecting to Discord. Setup changes only this local preview; no real server rule is created.</p><p>No Discord identities, member data or messages are sent to research or analytics. Following a web journey uses its separate aggregate counter path.</p><p>The real bot requires locally supplied Discord credentials. Its native replies are visible only to the person who invokes them; Discord still processes those interactions.</p>'});
    root.querySelector('[data-info="discord-message"]').onclick = () => openInfoDialog({title:language==='nl'?'Over dit antwoord':'About this reply',body:`<p>${esc(buildReply({action,language,config,setupState}).embeds[0].footer.text)}</p>`});
    root.querySelector('#discord-language').onchange = event => { language = event.target.value; render(); };
    root.querySelector('#discord-role').onchange = event => { moderator = event.target.value === 'moderator'; render(); };
    root.querySelectorAll('[data-command]').forEach(button => button.onclick = async () => {
      const command = button.dataset.command;
      if (command === 'setup') setupState = await installSyntheticRule(syntheticGuild, { canManage: moderator, language, botId: 'simulated-bot' });
      action = command === 'demo' ? 'reflection' : command;
      render();
    });
    root.querySelectorAll('[data-native-action]').forEach(button => button.onclick = () => {
      const parsed = parseButton(button.dataset.nativeAction);
      if (!parsed) return;
      ({ action, language } = parsed); setupState = undefined; render();
    });
    root.querySelector('#synthetic-block').onclick = () => {
      root.querySelector('#synthetic-block-result').textContent = ruleInstalled ? `${language === 'nl' ? 'Geblokkeerd: ' : 'Blocked: '}${shortWarning(language)}` : 'Choose Server moderator and run /before setup first.';
    };
  }
  render();
  try {
    const url = new URL(`/api/public/sites/${siteId}/config`, endpoint);
    url.searchParams.set('country', 'NL');
    const response = await fetch(url, { credentials: 'omit', referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(2500) });
    if (response.ok) {
      const published = await response.json();
      config = { ...config, intervention: published.arms[0]?.intervention };
      ready = true; render();
    }
  } catch { /* Native support is available from bundled content with no network. */ }
}
