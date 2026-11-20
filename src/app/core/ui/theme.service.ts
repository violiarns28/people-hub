import { Service, effect, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'peoplehub.theme';

/** Light/dark theme. Persists the choice and stamps `data-theme` on the root element. */
@Service()
export class ThemeService {
  readonly mode = signal<ThemeMode>(this.initial());

  constructor() {
    effect(() => {
      const mode = this.mode();
      document.documentElement.dataset['theme'] = mode;
      try {
        localStorage.setItem(STORAGE_KEY, mode);
      } catch {
        // Storage may be unavailable; the in-memory choice still applies.
      }
    });
  }

  toggle(): void {
    this.mode.update((mode) => (mode === 'light' ? 'dark' : 'light'));
  }

  private initial(): ThemeMode {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') {
        return saved;
      }
    } catch {
      // fall through to system preference
    }
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
}
