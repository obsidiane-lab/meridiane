import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, computed, effect, inject, signal } from '@angular/core';
import type { ThemeMode } from '../models/theme.model';

const DEFAULT_MODE: ThemeMode = 'light';
const STORAGE_KEY = 'theme';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly modeSignal = signal<ThemeMode>(this.loadMode());

  readonly mode = this.modeSignal.asReadonly();
  readonly isDark = computed(() => this.modeSignal() === 'dark');

  constructor() {
    effect(() => {
      const mode = this.modeSignal();
      this.applyMode(mode);
      this.persistMode(mode);
    });
  }

  setMode(mode: ThemeMode): void {
    this.modeSignal.set(mode);
  }

  toggleMode(): void {
    this.setMode(this.isDark() ? 'light' : 'dark');
  }

  private applyMode(mode: ThemeMode): void {
    if (!this.isBrowser) {
      return;
    }
    this.document.documentElement.classList.toggle('dark', mode === 'dark');
  }

  private persistMode(mode: ThemeMode): void {
    const storage = this.getStorage();
    if (!storage) {
      return;
    }
    try {
      storage.setItem(STORAGE_KEY, mode);
    } catch {
      return;
    }
  }

  private loadMode(): ThemeMode {
    const storage = this.getStorage();
    if (!storage) {
      return DEFAULT_MODE;
    }
    return this.resolveMode(storage.getItem(STORAGE_KEY)) ?? DEFAULT_MODE;
  }

  private getStorage(): Storage | null {
    if (!this.isBrowser) {
      return null;
    }
    try {
      return this.document.defaultView?.localStorage ?? null;
    } catch {
      return null;
    }
  }

  private resolveMode(value: string | null): ThemeMode | null {
    return value === 'light' || value === 'dark' ? value : null;
  }
}
