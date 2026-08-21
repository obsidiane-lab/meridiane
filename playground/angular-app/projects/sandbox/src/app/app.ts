import { Component, computed, signal, inject } from '@angular/core';
import {RouterLink, RouterLinkActive, RouterOutlet} from '@angular/router';
import {AuthStateService} from './core/auth-state.service';
import {BACKEND_BASE_URL} from './core/backend';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  readonly auth = inject(AuthStateService);

  protected readonly title = signal('sandbox');
  readonly backendBaseUrl = BACKEND_BASE_URL;

  readonly shortToken = computed(() => {
    const t = this.auth.token();
    if (!t) return null;
    return t.length > 24 ? `${t.slice(0, 12)}…${t.slice(-8)}` : t;
  });

  logout(): void {
    this.auth.clear();
  }
}
