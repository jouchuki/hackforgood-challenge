import { createElement, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BeforeProvider, BeforeForm, useBefore } from '../src/index.js';

function Search() {
  const before = useBefore();
  return createElement('section', null,
    createElement('p', { role: 'status' }, before.error ? before.error.message : before.ready ? 'Connected to local published configuration.' : 'Connecting…'),
    createElement(BeforeForm, { demo: true, action: '/help', method: 'get' },
      createElement('label', null, 'Synthetic search ', createElement('input', { name: 'q', type: 'search', defaultValue: 'test-trigger-red' })),
      createElement('button', { type: 'submit' }, 'Submit')),
    createElement('p', null, 'This is a real React wrapper: unmounting removes its adapter listeners.'));
}
function Demo() {
  const [mounted, setMounted] = useState(true);
  const endpoint = location.port === '3004' ? `${location.protocol}//${location.hostname}:3000` : location.origin;
  return createElement('div', { style: { fontFamily: 'sans-serif', maxWidth: 720, margin: '50px auto', padding: 24, lineHeight: 1.7 } },
    createElement('h1', null, 'Next Step · React lifecycle demo'),
    createElement('button', { onClick: () => setMounted(!mounted), style: { marginBottom: 20 } }, mounted ? 'Unmount provider' : 'Mount provider'),
    mounted ? createElement(BeforeProvider, { endpoint, siteId: 'demo-forum', demo: true }, createElement(Search)) : createElement('p', null, 'Provider unmounted. No SDK listeners remain.'),
    createElement('p', null, createElement('a', { href: '/moderator/integrations' }, 'Back to integrations')));
}
createRoot(document.querySelector('#react-demo')).render(createElement(Demo));
