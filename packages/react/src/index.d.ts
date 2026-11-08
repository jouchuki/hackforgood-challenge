import type { ReactNode, FormHTMLAttributes, ReactElement } from 'react';
export interface Trigger { type: 'search' | 'chat' | 'navigation'; severity: 'low' | 'medium' | 'high'; language?: string; country?: string }
export interface BeforeOptions { endpoint: string; siteId: string; language?: string; country?: string; demo?: boolean }
export interface BindingOptions { input?: string; demo?: boolean; type?: Trigger['type'] }
export interface BeforeHook { ready: boolean; error: Error | null; intervene(trigger?: Trigger): Promise<boolean>; bind(form: HTMLFormElement | string, options?: BindingOptions): () => void; client: unknown }
export function useBeforeClient(options: BeforeOptions): BeforeHook;
export function BeforeProvider(props: BeforeOptions & { children?: ReactNode }): ReactElement;
export function useBefore(): BeforeHook;
export function BeforeForm(props: FormHTMLAttributes<HTMLFormElement> & { inputSelector?: string; demo?: boolean }): ReactElement;
