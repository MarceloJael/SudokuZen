/** Theme management (see DESIGN.md §2). Theme is the `data-theme` attribute on
 * <html>. Three themes: light (default), dark, hc (high contrast). */

export type Theme = 'light' | 'dark' | 'hc';

export const THEMES: Theme[] = ['light', 'dark', 'hc'];

const STORAGE_KEY = 'sz-theme';

export function applyTheme(theme: Theme, animate = true): void {
  const root = document.documentElement;
  if (animate && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    root.classList.add('sz-theme-anim');
    window.setTimeout(() => root.classList.remove('sz-theme-anim'), 250);
  }
  root.dataset.theme = theme;
  localStorage.setItem(STORAGE_KEY, theme);
}

/** Initialization: saved choice > system preference. */
export function initialTheme(): Theme {
  const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
  if (saved && THEMES.includes(saved)) return saved;
  if (matchMedia('(prefers-contrast: more)').matches) return 'hc';
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
