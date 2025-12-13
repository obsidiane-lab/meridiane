import {Component, inject, signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {HttpClient} from '@angular/common/http';
import {Router} from '@angular/router';
import {BACKEND_BASE_URL} from '../../core/backend';
import {AuthStateService} from '../../core/auth-state.service';

type LoginResponse = {token: string};

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent {
  readonly backendBaseUrl = BACKEND_BASE_URL;

  private readonly fb = inject(FormBuilder);
  readonly form = this.fb.nonNullable.group({
    email: ['dev@meridiane.local', [Validators.required, Validators.email]],
    password: ['dev', [Validators.required]],
  });

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  constructor(
    private readonly http: HttpClient,
    private readonly auth: AuthStateService,
    private readonly router: Router,
  ) {
  }

  login(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.error.set(null);
    this.loading.set(true);

    const {email, password} = this.form.getRawValue();
    this.http
      .post<LoginResponse>(`${BACKEND_BASE_URL}/api/auth/login`, {
        email,
        password,
      })
      .subscribe({
        next: (res) => {
          this.auth.setToken(res.token);
          void this.router.navigateByUrl('/conversations');
        },
        error: (err) => {
          this.error.set(err?.error?.message || err?.message || 'Login failed');
          this.loading.set(false);
        },
        complete: () => this.loading.set(false),
      });
  }

  loginAsDev(): void {
    this.form.setValue({email: 'dev@meridiane.local', password: 'dev'});
    this.login();
  }

  loginAsAdmin(): void {
    this.form.setValue({email: 'admin@meridiane.local', password: 'admin'});
    this.login();
  }
}
