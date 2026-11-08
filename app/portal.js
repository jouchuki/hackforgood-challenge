import '@fontsource-variable/dm-sans';
import '@fontsource-variable/newsreader';
import './styles.css';
import { defaultConfig, initialExperiments, makeSyntheticSeries, syntheticSummary, escapeHtml as esc } from './shared.js';
import { icon, mark, landscape } from './icons.js';

const root = document.querySelector('#app');
let config = structuredClone(defaultConfig);
let draft = structuredClone(config);
let experiments = structuredClone(initialExperiments);
let series = makeSyntheticSeries();
let days = 14;
let language = 'en';
let online = true;
let currentPage = '';
let toastTimer;

const number = value => new Intl.NumberFormat('en').format(value);
const rate = (n, d) => d ? `${(n / d * 100).toFixed(1)}%` : '—';
const safeCount = n => n < 10 ? '—' : number(n);
const badge = (text, tone = '') => `<span class="badge ${tone}">${text}</span>`;
const pageNames = { overview: 'Overview', interventions: 'Intervention builder', research: 'Research studio', integrations: 'Integrations', resources: 'Evidence & resources' };
const navItems = [['overview', 'grid', 'Overview'], ['interventions', 'layers', 'Interventions'], ['research', 'flask', 'Research studio'], ['integrations', 'plug', 'Integrations'], ['resources', 'book', 'Evidence & resources']];

function notify(message) {
  const toast = document.querySelector('#toast');
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 4000);
}

async function request(path, options = {}) {
  const response = await fetch(`/api/demo/${path}`, { ...options, headers: { 'Content-Type': 'application/json' } });
  const value = await response.json();
  if (!response.ok) throw new Error(value.error || 'The request could not be completed.');
  return value;
}

function shell(page, content) {
  return `<aside class="sidebar" aria-label="Workspace sidebar">
    <a class="brand" href="#overview">${mark}<span>before<span class="brand-dot">.</span></span></a>
    <div class="workspace-switch">${icon('leaf')}<div><strong>Prevention workspace</strong><small>Hackathon for Good #8</small></div></div>
    <span class="nav-label">WORKSPACE</span>
    <nav aria-label="Main navigation">${navItems.map(([id, image, title]) => `<a href="#${id}" class="nav-link ${page === id ? 'active' : ''}" ${page === id ? 'aria-current="page"' : ''}>${icon(image)}<span>${title}</span>${id === 'research' ? '<span class="nav-count">Lab</span>' : ''}</a>`).join('')}</nav>
    <div class="sidebar-bottom"><div class="privacy-note">${icon('shield', 22)}<strong>Built around privacy.</strong><p>Aggregate insights.<br>No individual profiles.</p><a href="#resources">Our approach ${icon('arrow', 15)}</a></div>
    <a class="workspace-profile" href="#research"><span class="avatar">H8</span><span><strong>HFG8 team</strong><small>Synthetic workspace</small></span>${icon('chevron', 16)}</a></div>
  </aside>
  <div class="workspace-main"><header class="topbar"><div class="breadcrumbs"><button class="icon-button mobile-menu" aria-label="Open navigation" aria-expanded="false">${icon('menu')}</button><span>Workspace</span>${icon('chevron', 14)}<strong>${pageNames[page]}</strong></div><div class="topbar-actions">${badge('<span class="status-dot"></span> Demo workspace', 'subtle')}<a class="button small" href="/intervention/" target="_blank" rel="noopener">${icon('eye', 16)} Preview intervention ${icon('external', 14)}</a></div></header>
  <main id="main" class="page" tabindex="-1">${!online ? '<div class="notice">The backend is unavailable. You can explore the interface; publishing and experiment changes require npm run dev.</div>' : ''}${content}</main>
  <footer class="workspace-footer"><span>Stop Before It Starts <span class="footer-separator">/</span> A Hackathon for Good prototype</span><span>${icon('shield', 13)} Synthetic data only · No visitor tracking</span></footer></div>`;
}

function heading(eyebrow, title, description, actions = '') {
  return `<div class="page-heading"><div><p class="eyebrow">${eyebrow}</p><h1 tabindex="-1">${title}</h1><p class="subtitle">${description}</p></div>${actions ? `<div class="heading-actions">${actions}</div>` : ''}</div>`;
}

function metrics(summary) {
  return `<div class="metrics-grid">${[
    ['eye', 'Interventions shown', number(summary.shown), 'Moments to choose differently'],
    ['heart', 'Help links selected', number(summary.help), `${rate(summary.help, summary.shown)} of displayed interventions`],
    ['close', 'Interventions closed', number(summary.closed), 'Explicit close actions'],
    ['clock', 'Most common time visible', '10–30<span class="number-unit">s</span>', 'Coarse buckets, no individual records'],
  ].map(([image, title, value, note]) => `<article class="metric"><div class="metric-label">${icon(image, 17)}${title}</div><div class="metric-value">${value}</div><p>${note}</p></article>`).join('')}</div>`;
}

function chart() {
  const data = series.slice(-days);
  const max = Math.ceil(Math.max(...data.map(d => d.a + d.b)) / 250) * 250;
  const points = data.map((d, i) => [45 + i * 700 / (data.length - 1), 195 - (d.a + d.b) / max * 170]);
  const line = points.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  return `<div class="chart-wrap"><svg class="activity-chart" viewBox="0 0 780 230" role="img" aria-label="Synthetic intervention impressions over ${days} days. Total ${number(data.reduce((s, d) => s + d.a + d.b, 0))}. These are simulated counts, not real traffic.">
    ${[0, 1, 2, 3, 4].map(i => `<line x1="45" y1="${195 - i * 42.5}" x2="745" y2="${195 - i * 42.5}" class="gridline"/><text x="30" y="${199 - i * 42.5}" text-anchor="end">${number(max * i / 4)}</text>`).join('')}
    <path d="${line} L745,195 L45,195 Z" class="chart-area"/><path d="${line}" class="chart-line"/>
    ${points.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="3.5" class="chart-point"><title>Day ${data[i].day}: ${number(data[i].a + data[i].b)} synthetic impressions</title></circle>`).join('')}
    ${data.filter((_, i) => i % (days === 14 ? 2 : 1) === 0 || i === data.length - 1).map(d => `<text x="${45 + data.indexOf(d) * 700 / (data.length - 1)}" y="222" text-anchor="middle">Day ${d.day}</text>`).join('')}
  </svg></div>`;
}

function experimentRows(summary) {
  return `<div class="table-scroll"><table><thead><tr><th>Intervention variant</th><th>Shown</th><th>Help selected</th><th>Help selection rate</th></tr></thead><tbody>${summary.variants.map(v => `<tr><td><span class="variant-id ${v.id === 'B' ? 'sage' : ''}">${v.id}</span><strong>${v.name}</strong></td><td>${safeCount(v.shown)}</td><td>${safeCount(v.help)}</td><td><span class="rate-bar"><span style="width:${v.help / v.shown * 450}%"></span></span><strong>${v.help >= 10 ? rate(v.help, v.shown) : '—'}</strong></td></tr>`).join('')}</tbody></table></div>`;
}

function overview() {
  const summary = syntheticSummary(series.slice(-days));
  const running = experiments.filter(e => e.status === 'running').length;
  return `${heading('A LITTLE PAUSE. A DIFFERENT POSSIBILITY.', 'Make room for a better next step.', 'Build thoughtful interventions. Connect people to help. Learn what works.')}
  <section class="hero-panel" data-od-id="prevention-journey"><div class="hero-copy"><span class="light-eyebrow"><span class="status-dot"></span> YOUR PREVENTION JOURNEY</span><h2>A moment of reflection.<br>A way forward.</h2><p>Meet the moment with empathy, make the consequences clear, and keep support within reach.</p><div class="hero-actions"><a class="button primary" href="#interventions">Build your intervention ${icon('arrow', 17)}</a><a class="text-link" href="/intervention/" target="_blank" rel="noopener">Experience the journey ${icon('external', 15)}</a></div></div><div class="hero-art">${landscape}<span class="art-caption">Small moments can change a direction.</span></div></section>
  <section class="overview-insights" data-od-id="aggregate-overview"><div class="section-heading"><div><h2>Your impact, at a glance</h2><p>Explore the measurement experience with simulated traffic.</p></div><div class="inline-actions">${badge('Synthetic data', 'warm')}<label class="select-label"><span class="sr-only">Reporting period</span><select id="period"><option value="14" ${days === 14 ? 'selected' : ''}>Last 14 days</option><option value="7" ${days === 7 ? 'selected' : ''}>Last 7 days</option></select></label></div></div>${metrics(summary)}
  <div class="insight-columns"><article class="panel activity-panel"><div class="panel-heading"><div><h3>Moments of interruption</h3><p>Interventions shown over time</p></div><span class="chart-legend"><i></i> Impressions</span></div>${chart()}<div class="panel-foot">${icon('info', 15)} These counts demonstrate the dashboard, not prevention effectiveness.</div></article>
  <article class="panel journey-panel"><div class="panel-heading"><div><h3>A considered journey</h3><p>Three steps. One clear purpose.</p></div>${icon('layers', 20)}</div><ol class="journey-list">${[['01', 'Create a pause', 'A supportive message about choice.'], ['02', 'Build understanding', 'Explain harm and legal consequences.'], ['03', 'Connect to help', 'A clear handover to human support.']].map(([n, title, body]) => `<li><span>${n}</span><div><strong>${title}</strong><p>${body}</p></div></li>`).join('')}</ol><a class="panel-link" href="#interventions">Shape this experience ${icon('arrow', 16)}</a></article></div></section>
  <section class="panel research-summary" data-od-id="experiment-summary"><div class="panel-heading"><div><span class="eyebrow">RESEARCH STUDIO</span><h2>A moment before the message</h2><p>Immediate warning versus a reflection-first journey.</p></div><a class="button small" href="#research">Open research studio ${icon('arrow', 16)}</a></div>${experimentRows(summary)}<div class="panel-foot spaced"><span>${badge(`${running} running simulation${running === 1 ? '' : 's'}`, 'subtle')} Netherlands · Dutch & English</span><span>No statistical or clinical conclusions from simulated results.</span></div></section>`;
}

function miniature() {
  const copy = draft[language];
  return `<div class="mini-page" lang="${language}"><div class="mini-top"><span class="mini-brand">${mark} before.</span><span>${language === 'nl' ? 'Een moment voor jezelf' : 'A moment for yourself'}</span></div><div class="mini-content">${landscape}<p class="eyebrow">${language === 'nl' ? 'JE VOLGENDE STAP TELT' : 'YOUR NEXT STEP MATTERS'}</p><h2>${esc(copy.title)}</h2><p>${esc(copy.body)}</p><span class="button primary">${esc(copy.button)} ${icon('arrow', 15)}</span><small>${language === 'nl' ? 'Of ga direct naar hulp' : 'Or go straight to support'}</small></div><div class="mini-bottom">${icon('shield', 12)} ${draft.legal ? (language === 'nl' ? 'Juridische informatie in de volgende stap' : 'Legal information included in the next step') : (language === 'nl' ? 'Gericht op steun en begrip' : 'Focused on support and understanding')}</div></div>`;
}

function builder() {
  return `${heading('INTERVENTION BUILDER', 'A message that opens a door.', 'Create the first moment of the journey. Keep the next step clear.', `<button class="button" id="reset-draft">Reset changes</button><button class="button primary" id="publish" ${!online ? 'disabled' : ''}>${icon('check', 17)} Publish to demo</button>`)}
  <div class="builder-layout"><section class="panel editor-panel"><div class="panel-heading"><h2>Your intervention</h2>${badge(`Version ${config.revision}`, 'subtle')}</div><form id="builder-form"><label>Intervention name<input name="name" maxlength="100" value="${esc(draft.name)}" required></label><div class="editor-divider"></div><div class="section-heading compact"><h3>First message</h3><div class="segmented" aria-label="Editing language"><button type="button" data-language="en" aria-pressed="${language === 'en'}" class="${language === 'en' ? 'selected' : ''}">English</button><button type="button" data-language="nl" aria-pressed="${language === 'nl'}" class="${language === 'nl' ? 'selected' : ''}">Nederlands</button></div></div>
  <label>Headline<input name="title" maxlength="1500" value="${esc(draft[language].title)}" required></label><label>Reflection message<textarea name="body" rows="5" maxlength="1500" required>${esc(draft[language].body)}</textarea></label><label>Continue button<input name="button" maxlength="1500" value="${esc(draft[language].button)}" required></label>
  <div class="editor-divider"></div><div class="toggle-row"><div><strong>Include legal information</strong><p>Show the country block in the education step.</p></div><label class="switch"><input name="legal" type="checkbox" ${draft.legal ? 'checked' : ''} aria-label="Include legal information"><span></span></label></div>
  <label>Jurisdiction<select name="country"><option value="NL" ${draft.country === 'NL' ? 'selected' : ''}>Netherlands</option><option value="OTHER" ${draft.country === 'OTHER' ? 'selected' : ''}>Other / unknown — no local legal claim</option></select></label><p class="field-hint">Demo country setting. IP location is not implemented.</p><div class="editor-note">${icon('info', 18)}<p>Reflection-first is a research hypothesis. This message does not claim to reduce arousal or replace professional support.</p></div></form></section>
  <section class="preview-column"><div class="preview-toolbar"><span><span class="status-dot"></span> Live preview</span><a href="/intervention/" target="_blank" rel="noopener">Open published version ${icon('external', 14)}</a></div><div id="live-preview">${miniature()}</div><div class="preview-description"><span>01 Reflection</span><span>02 Understanding</span><span>03 Support</span></div><p class="field-hint">Changes are visible here immediately. Publish to update the demo journey.</p></section></div>`;
}

function research() {
  const summary = syntheticSummary(series);
  return `${heading('RESEARCH STUDIO', 'Better questions. Better interventions.', 'Design message experiments and explore outcomes without individual profiles.', `<button class="button primary" id="new-experiment" ${!online ? 'disabled' : ''}>${icon('plus', 17)} New experiment</button>`)}
  <div class="research-banner">${icon('flask', 24)}<div><strong>A working lab for synthetic experiments.</strong><p>Test the workflow here. Simulated results do not establish real-world efficacy.</p></div><button class="button small" id="generate">${icon('play', 15)} Generate synthetic traffic</button></div>
  <div class="section-heading"><h2>Your experiments <span class="heading-count">${experiments.length}</span></h2><button class="text-link" id="export">${icon('download', 16)} Export aggregates</button></div>
  ${experiments.map((e, index) => `<article class="panel experiment-panel"><div class="panel-heading"><div><div class="inline-actions">${badge(e.status === 'running' ? 'Running simulation' : e.status === 'paused' ? 'Paused' : 'Draft', e.status === 'running' ? 'sage' : 'subtle')}<span class="meta">${index === 0 ? 'EXPERIMENT 001' : `EXPERIMENT ${String(index + 1).padStart(3, '0')}`}</span></div><h2>${esc(e.name)}</h2><p class="experiment-hypothesis">${esc(e.hypothesis)}</p></div><button class="button small experiment-toggle" data-id="${esc(e.id)}" data-status="${e.status === 'running' ? 'paused' : 'running'}" ${!online ? 'disabled' : ''}>${icon(e.status === 'running' ? 'pause' : 'play', 15)} ${e.status === 'running' ? 'Pause' : 'Run simulation'}</button></div>
  <div class="experiment-config"><div><span class="meta">ALLOCATION</span><strong>A ${100 - e.allocation}% <span class="muted">/</span> B ${e.allocation}%</strong><div class="allocation-track"><span style="width:${100 - e.allocation}%"></span></div></div><div><span class="meta">PRIMARY OUTCOME</span><strong>${e.primary === 'help_rate' ? 'Help selection rate' : 'Journey completion rate'}</strong></div><div><span class="meta">ELIGIBLE CONTEXT</span><strong>Netherlands · EN / NL</strong></div><div><span class="meta">ASSIGNMENT</span><strong>Per intervention exposure</strong></div></div>
  ${index === 0 ? experimentRows(summary) : '<div class="experiment-empty">Your experiment is configured. Outcome collection for custom studies is not connected in this prototype.</div>'}<div class="panel-foot">${icon('shield', 15)} No persistent assignment cookies. No person-level or long-term conclusions.</div></article>`).join('')}
  <section class="template-section"><div class="section-heading"><div><h2>Ground the message in a clear approach</h2><p>Starting points for future experiments; no assumed winner.</p></div></div><div class="template-grid">${[['01', 'Supportive', 'Make change feel possible and offer a concrete next step.'], ['02', 'Harm-focused', 'Explain the impact on children, with a route to help.'], ['03', 'Consequences', 'Present accurate legal consequences without personal threats.'], ['04', 'Combined', 'Bring approaches together and evaluate the whole experience.']].map(([n, title, body]) => `<article><span class="meta">${n}</span><h3>${title}</h3><p>${body}</p></article>`).join('')}</div></section>`;
}

const snippet = `<script type="module" src="${location.origin}/embed/snippet.js" data-country="NL"></script>`;

function integrations() {
  return `${heading('INTEGRATIONS', 'One engine. More ways to reach people.', 'Start with a website. Extend the same prevention journey through platform adapters.')}
  <section class="panel install-panel"><div class="panel-heading"><div class="integration-title"><span class="platform-icon">${icon('code', 28)}</span><div>${badge('Working local demo', 'sage')}<h2>Custom websites</h2><p>HTML, Next.js, React, and other browser frontends.</p></div></div><a class="button primary" href="/demo/">Try the website demo ${icon('arrow', 17)}</a></div><div class="install-content"><div><h3>Add the module. Connect the moment.</h3><p>The snippet listens for the shared <code>sbis:trigger</code> event. Your platform adapter supplies that event; the demo uses the existing synthetic matcher.</p><p class="field-hint">Local development example. A deployable cross-origin bundle is future packaging work.</p></div><div class="code-block"><div><span>HTML · module snippet</span><button id="copy-snippet" class="icon-button" aria-label="Copy installation snippet">${icon('copy', 17)}</button></div><pre><code>${esc(snippet)}</code></pre></div></div><div class="panel-foot spaced"><a class="text-link" href="/mock-platform/">Open starter forum ${icon('external', 14)}</a><a class="text-link" href="/demo/?platform=fieldnotes">Open second website ${icon('external', 14)}</a></div></section>
  <div class="section-heading"><div><h2>The integration roadmap</h2><p>These adapters are planned. They are not installed or implemented.</p></div>${badge('5 planned adapters', 'warm')}</div>
  <div class="integration-grid">${[['W', 'WordPress', 'Installable plugin', 'Site search and explicitly connected community forms.'], ['D', 'Discord', 'Native app / bot', 'AutoMod interruption and interactive support. No native search interception.'], ['d', 'Discourse', 'Theme component / plugin', 'Connect forum search and composer submissions.'], ['N', 'NodeBB', 'Forum plugin', 'Bridge supported submission hooks to the shared engine.'], ['F', 'Flarum', 'Forum extension', 'A native adapter for supported search and posting actions.']].map(([letter, title, type, body]) => `<article class="panel integration-card"><div class="section-heading"><span class="platform-monogram">${letter}</span>${badge('Planned', 'subtle')}</div><h3>${title}</h3><span class="meta">${type}</span><p>${body}</p></article>`).join('')}</div>`;
}

function resources() {
  return `${heading('EVIDENCE & RESOURCES', 'Build on evidence. Leave room to learn.', 'Keep research findings, experimental ideas, and service information distinct.')}
  <div class="resource-columns"><section class="panel resource-panel"><span class="eyebrow">MESSAGE DESIGN</span><h2>What the research helps us ask</h2><div class="resource-item"><strong>Do different messages change help engagement?</strong><p>The Ahmia study reports stronger engagement for harm-focused messages among the approaches tested. It is a 2026 preprint.</p><a class="text-link" href="https://arxiv.org/abs/2606.06417" target="_blank" rel="noopener noreferrer">Read the study ${icon('external', 14)}</a></div><div class="resource-item"><strong>Interruption and help-seeking are different outcomes.</strong><p>The Google study evaluates subsequent searches and help-resource clicks separately. It uses a difference-in-differences design.</p><a class="text-link" href="https://arxiv.org/abs/2606.06126" target="_blank" rel="noopener noreferrer">Read the study ${icon('external', 14)}</a></div><div class="resource-item"><strong>Reflection first is a hypothesis.</strong><p>Our proposed sequence has not been established as a way to reduce arousal. Simulated dashboard results are not evidence for it.</p></div></section>
  <section class="panel resource-panel"><span class="eyebrow">ROUTES TO HUMAN SUPPORT</span><h2>A handover, not a replacement</h2><div class="resource-item"><strong>Preventielijn van Offlimits</strong><p>Dutch prevention service listed in the challenge directory. Confirm availability and confidentiality with the service.</p><a class="text-link" href="https://preventielijn.offlimits.nl" target="_blank" rel="noopener noreferrer">Visit the service ${icon('external', 14)}</a></div><div class="resource-item"><strong>Stoppen is mogelijk</strong><p>Dutch self-help resource listed in the challenge brief.</p><a class="text-link" href="https://stoppen-is-mogelijk.eu" target="_blank" rel="noopener noreferrer">Explore self-help ${icon('external', 14)}</a></div><div class="resource-item"><strong>ReDirection</strong><p>International self-help programme listed in the brief. The starter directory marks its entry as needing verification.</p><a class="text-link" href="https://www.suojellaanlapsia.fi/en/redirection" target="_blank" rel="noopener noreferrer">Visit programme ${icon('external', 14)}</a></div></section></div>
  <section class="panel privacy-panel"><div>${icon('shield', 30)}<h2>Count outcomes. Keep people out of the data.</h2><p>This design prototype stores no visitor events. Its charts use generated aggregate fixtures. Published message configuration and experiment definitions live in the local demo server's memory and reset when it restarts.</p></div><div class="privacy-rules"><p>${icon('check', 17)} No tracking cookies or visitor profiles</p><p>${icon('check', 17)} No submitted text in analytics</p><p>${icon('check', 17)} No live experiments or detection API</p><p>${icon('check', 17)} Counts below 10 suppressed in reporting</p></div></section>`;
}

function openExperimentDialog() {
  const dialog = document.createElement('dialog');
  dialog.className = 'experiment-dialog';
  dialog.innerHTML = `<form id="experiment-form"><div class="dialog-heading"><div><p class="eyebrow">RESEARCH STUDIO</p><h2>Create an experiment</h2></div><button class="icon-button" type="button" id="close-dialog" aria-label="Close experiment editor">${icon('close')}</button></div><p class="subtitle">Compare an immediate warning with a reflection-first journey using synthetic traffic.</p><label>Experiment name<input name="name" maxlength="100" required placeholder="Give your research question a name"></label><label>Hypothesis<textarea name="hypothesis" rows="3" maxlength="1500" required placeholder="What do you expect to change, and why?"></textarea></label><label>Primary outcome<select name="primary"><option value="help_rate">Help selection rate</option><option value="completion_rate">Journey completion rate</option></select></label><label>Allocation to reflection-first variant B <output id="allocation-value">50%</output><input name="allocation" type="range" min="10" max="90" step="10" value="50"></label><p class="field-hint">Variant A receives the remainder. Assignment is per exposure, without persistent visitor IDs.</p><p id="dialog-error" class="form-error" role="alert"></p><div class="dialog-actions"><button class="button" type="button" id="cancel-dialog">Cancel</button><button class="button primary" type="submit">Create experiment ${icon('arrow', 16)}</button></div></form>`;
  root.appendChild(dialog);
  const previouslyFocused = document.activeElement;
  dialog.addEventListener('close', () => { dialog.remove(); previouslyFocused?.focus(); });
  dialog.querySelector('#close-dialog').onclick = () => dialog.close();
  dialog.querySelector('#cancel-dialog').onclick = () => dialog.close();
  dialog.querySelector('[name="allocation"]').oninput = e => dialog.querySelector('output').value = `${e.target.value}%`;
  dialog.querySelector('form').onsubmit = async e => {
    e.preventDefault();
    const form = new FormData(e.target);
    const button = e.target.querySelector('[type="submit"]');
    button.disabled = true;
    try {
      const experiment = await request('experiments', { method: 'POST', body: JSON.stringify({ name: form.get('name'), hypothesis: form.get('hypothesis'), primary: form.get('primary'), allocation: Number(form.get('allocation')) }) });
      experiments.push(experiment);
      dialog.close();
      render();
      notify('Experiment created as a draft.');
    } catch (error) { dialog.querySelector('#dialog-error').textContent = error.message; button.disabled = false; }
  };
  dialog.showModal();
}

function exportAggregates() {
  const summary = syntheticSummary(series);
  const rows = [['dataset', 'variant', 'shown', 'help_selected', 'closed'], ...summary.variants.map(v => ['synthetic', v.id, v.shown, v.help, v.closed])];
  const url = URL.createObjectURL(new Blob([rows.map(row => row.join(',')).join('\n')], { type: 'text/csv' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'before-synthetic-aggregates.csv'; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  notify('Synthetic aggregate results exported.');
}

function bind(page) {
  document.querySelector('.mobile-menu')?.addEventListener('click', e => {
    const open = document.body.classList.toggle('navigation-open');
    e.currentTarget.setAttribute('aria-expanded', String(open));
  });
  document.querySelector('#period')?.addEventListener('change', e => { days = Number(e.target.value); render(); });
  document.querySelector('#generate')?.addEventListener('click', () => { series = makeSyntheticSeries(1.1 + Math.random() * 0.6); render(); notify('New synthetic aggregate traffic generated.'); });
  document.querySelector('#export')?.addEventListener('click', exportAggregates);
  document.querySelector('#new-experiment')?.addEventListener('click', openExperimentDialog);
  document.querySelectorAll('.experiment-toggle').forEach(button => button.onclick = async () => {
    button.disabled = true;
    try {
      const changed = await request(`experiments/${button.dataset.id}`, { method: 'PATCH', body: JSON.stringify({ status: button.dataset.status }) });
      experiments = experiments.map(e => e.id === changed.id ? changed : e); render(); notify(changed.status === 'running' ? 'Synthetic experiment started.' : 'Synthetic experiment paused.');
    } catch (error) { notify(error.message); button.disabled = false; }
  });
  document.querySelector('#copy-snippet')?.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(snippet); notify('Local installation snippet copied.'); }
    catch { notify('Copy is unavailable here. Select the snippet to copy it manually.'); }
  });
  if (page === 'interventions') {
    document.querySelectorAll('[data-language]').forEach(button => button.onclick = () => { language = button.dataset.language; render(); });
    const form = document.querySelector('#builder-form');
    form.addEventListener('submit', e => e.preventDefault());
    form.addEventListener('input', e => {
      const { name, value, checked } = e.target;
      if (name === 'name') draft.name = value;
      else if (name === 'legal') draft.legal = checked;
      else if (name === 'country') draft.country = value;
      else if (['title', 'body', 'button'].includes(name)) draft[language][name] = value;
      document.querySelector('#live-preview').innerHTML = miniature();
    });
    document.querySelector('#reset-draft').onclick = () => { draft = structuredClone(config); render(); notify('Draft reset to the published version.'); };
    document.querySelector('#publish').onclick = async e => {
      if (!form.reportValidity()) return;
      e.currentTarget.disabled = true;
      try { config = await request('config', { method: 'PUT', body: JSON.stringify(draft) }); draft = structuredClone(config); render(); notify(`Version ${config.revision} published to the local demo.`); }
      catch (error) { notify(error.message); document.querySelector('#publish').disabled = false; }
    };
  }
}

function render() {
  const raw = location.hash.slice(1) || 'overview';
  const page = Object.hasOwn(pageNames, raw) ? raw : 'overview';
  document.body.classList.remove('navigation-open');
  root.innerHTML = shell(page, { overview, interventions: builder, research, integrations, resources }[page]());
  document.title = `${pageNames[page]} — Before`;
  bind(page);
  if (currentPage && currentPage !== page) { window.scrollTo(0, 0); document.querySelector('h1')?.focus({ preventScroll: true }); }
  currentPage = page;
}

render();
Promise.all([request('config'), request('experiments')]).then(([savedConfig, savedExperiments]) => {
  config = savedConfig; draft = structuredClone(config); experiments = savedExperiments; render();
}).catch(() => { online = false; render(); });
window.addEventListener('hashchange', render);
document.addEventListener('keydown', e => { if (e.key === 'Escape') { document.body.classList.remove('navigation-open'); document.querySelector('.mobile-menu')?.setAttribute('aria-expanded', 'false'); } });
