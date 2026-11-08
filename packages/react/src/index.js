import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createBefore } from '../../browser/src/index.js';

const BeforeContext = createContext(null);

/** Initialize on the client only; dispose on unmount and on configuration changes. */
export function useBeforeClient({ endpoint, siteId, language, country, demo = false }) {
  const clientRef = useRef(null);
  const [status, setStatus] = useState({ ready: false, error: null });
  useEffect(() => {
    const client = createBefore();
    let mounted = true;
    clientRef.current = client;
    setStatus({ ready: false, error: null });
    client.init({ endpoint, siteId, language, country, demo }).then(() => {
      if (mounted) setStatus({ ready: true, error: null });
    }).catch(error => { if (mounted) setStatus({ ready: false, error }); });
    return () => { mounted = false; client.destroy(); if (clientRef.current === client) clientRef.current = null; };
  }, [endpoint, siteId, language, country, demo]);
  const intervene = useCallback(trigger => clientRef.current ? clientRef.current.intervene(trigger) : Promise.resolve(false), []);
  const bind = useCallback((form, options) => clientRef.current?.bind(form, options) || (() => {}), []);
  return useMemo(() => ({ ...status, intervene, bind, client: clientRef.current }), [status, intervene, bind]);
}

export function BeforeProvider({ children, ...options }) {
  return createElement(BeforeContext.Provider, { value: useBeforeClient(options) }, children);
}

export function useBefore() {
  const value = useContext(BeforeContext);
  if (!value) throw new Error('useBefore must be rendered inside BeforeProvider.');
  return value;
}

/** A deliberately explicit synthetic form adapter; ordinary submissions are untouched. */
export function BeforeForm({ children, inputSelector = 'input[type="search"], input[name="q"]', demo = false, ...props }) {
  const formRef = useRef(null);
  const before = useBefore();
  useEffect(() => {
    if (!before.ready || !formRef.current || !demo) return;
    return before.bind(formRef.current, { input: inputSelector, demo: true });
  }, [before.ready, before.bind, before.client, inputSelector, demo]);
  return createElement('form', { ...props, ref: formRef }, children);
}
