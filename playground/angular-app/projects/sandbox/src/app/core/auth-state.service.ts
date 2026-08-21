import {Injectable, signal} from '@angular/core';

const TOKEN_KEY = 'MERIDIANE_DEV_TOKEN';

@Injectable({providedIn: 'root'})
export class AuthStateService {
  readonly token = signal<string | null>(localStorage.getItem(TOKEN_KEY));

  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
    this.token.set(token);
  }

  clear(): void {
    localStorage.removeItem(TOKEN_KEY);
    this.token.set(null);
  }
}

export function getStoredToken(): string | undefined {
  return localStorage.getItem(TOKEN_KEY) ?? undefined;
}

