import { escapeHtml as esc } from '../core/model.js';
import { stageBlocks } from '../core/message-blocks.js';

const names={en:{text:'Text',callout:'Notice',quote:'Pull quote',list:'List',divider:'Divider'},nl:{text:'Tekst',callout:'Opmerking',quote:'Uitgelichte tekst',list:'Lijst',divider:'Scheidingslijn'}};

/** Pure, escaped HTML shared by author previews and delivered message blocks. */
export function renderMessageBlocks(intervention,stage,language='en',{editable=false}={}) {
  const locale=language==='nl'?'nl':'en';
  return stageBlocks(intervention,stage).map(block=>{
    const value=block[locale];
    const attributes=`data-message-block="${esc(block.id)}" data-message-stage="${esc(stage)}" data-message-block-type="${esc(block.type)}"${editable?` role="button" tabindex="0" aria-label="${esc(`${locale==='nl'?'Bewerk':'Edit'} ${names[locale][block.type]}`)}"`:''}`;
    const classes=`before-content-block before-block-${block.type}${editable?' is-editable':''}`;
    if(block.type==='divider')return `<div class="${classes}" ${attributes}><hr></div>`;
    if(block.type==='quote')return `<blockquote class="${classes}" ${attributes}><p>${esc(value)}</p></blockquote>`;
    if(block.type==='callout')return `<aside class="${classes}" ${attributes}><span class="before-block-notice-mark" aria-hidden="true">i</span><p>${esc(value)}</p></aside>`;
    if(block.type==='list')return `<div class="${classes}" ${attributes}><ul>${value.split(/\r?\n/).map(line=>line.trim()).filter(Boolean).map(line=>`<li>${esc(line)}</li>`).join('')}</ul></div>`;
    return `<div class="${classes}" ${attributes}><p>${esc(value)}</p></div>`;
  }).join('');
}
