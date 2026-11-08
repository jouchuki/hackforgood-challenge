export type Language = 'en' | 'nl';
export interface Trigger { type: 'search' | 'chat' | 'navigation'; severity: 'low' | 'medium' | 'high'; language?: string; country?: string }
export interface BeforeOptions { siteId: string; endpoint: string; language?: string; country?: string; demo?: boolean }
export interface BindingOptions { input?: string; demo?: boolean; type?: Trigger['type'] }
export interface BeforeClient {
  init(options: BeforeOptions): Promise<unknown>;
  intervene(trigger?: Trigger): Promise<boolean>;
  bind(form: HTMLFormElement | string, options?: BindingOptions): () => void;
  bindForm(form: HTMLFormElement | string, options?: BindingOptions): () => void;
  destroy(): void;
  readonly ready: boolean;
  readonly config: unknown;
}
export function createBefore(environment?: Record<string, unknown>): BeforeClient;
export function normalizeTrigger(value: unknown): Trigger | null;
export function isSyntheticMatch(value: string): boolean;
export function supportedLanguage(languages?: string[]): Language;
export const Before: BeforeClient | null;
declare global { interface Window { Before: BeforeClient } }
