import { icon } from './icons.js';
import { escapeHtml } from '../core/model.js';
import './disclosure.css';

export function infoButton(id, label = 'About this view') {
  return `<button type="button" class="before-info-button" data-info="${escapeHtml(id)}" aria-label="${escapeHtml(label)}" aria-haspopup="dialog">${icon('info', 19)}</button>`;
}

export function openInfoDialog({ title, body }) {
  const previous = document.activeElement;
  const dialog = document.createElement('dialog');
  dialog.className = 'before-info-dialog';
  dialog.setAttribute('aria-labelledby', 'before-info-title');
  dialog.innerHTML = `<div class="before-info-heading"><h2 id="before-info-title">${escapeHtml(title)}</h2><button type="button" class="before-info-button" data-close aria-label="${document.documentElement.lang==='nl'?'Sluiten':'Close'}">${icon('close', 19)}</button></div><div class="before-info-body">${body}</div>`;
  document.body.append(dialog);
  dialog.querySelector('[data-close]').onclick = () => dialog.close();
  dialog.onclick = event => { if (event.target === dialog && (event.clientX < dialog.getBoundingClientRect().left || event.clientX > dialog.getBoundingClientRect().right || event.clientY < dialog.getBoundingClientRect().top || event.clientY > dialog.getBoundingClientRect().bottom)) dialog.close(); };
  dialog.onclose = () => { dialog.remove(); previous?.focus(); };
  dialog.showModal();
  return dialog;
}
