import {Component, inject, signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {BridgeFacade} from '@obsidiane/bridge-sandbox';
import {HttpHeaders} from '@angular/common/http';
import {JsonViewerComponent} from '../shared/json-viewer.component';

@Component({
  selector: 'app-http-lab',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, JsonViewerComponent],
  templateUrl: './http-lab.component.html',
  styleUrls: ['./http-lab.component.css'],
})
export class HttpLabComponent {
  readonly out = signal<unknown>(null);
  readonly err = signal<string | null>(null);
  readonly busy = signal(false);

  private readonly fb = inject(FormBuilder);
  readonly form = this.fb.nonNullable.group({
    delayMs: [250, [Validators.required, Validators.min(0), Validators.max(5000)]],
    flakyFails: [1, [Validators.required, Validators.min(0), Validators.max(10)]],
    echoPayload: ['{"hello":"world"}', [Validators.required]],
  });

  constructor(
    private readonly bridge: BridgeFacade,
  ) {
  }

  me(): void {
    this.run(() => this.bridge.get$('/api/auth/me'));
  }

  echoGet(): void {
    this.run(() => this.bridge.get$('/test/echo?x=1'));
  }

  echoPostJson(): void {
    const {echoPayload} = this.form.getRawValue();
    let body: unknown;
    try {
      body = JSON.parse(echoPayload);
    } catch (e) {
      this.err.set('Invalid JSON payload');
      return;
    }
    this.run(() => this.bridge.request$({
      method: 'POST',
      url: '/test/echo',
      headers: new HttpHeaders({'Content-Type': 'application/json'}),
      body,
    }));
  }

  delay(): void {
    const {delayMs} = this.form.getRawValue();
    this.run(() => this.bridge.get$(`/test/delay?ms=${delayMs}`));
  }

  flaky(): void {
    const {flakyFails} = this.form.getRawValue();
    this.run(() => this.bridge.get$(`/test/flaky?key=ui&fails=${flakyFails}`));
  }

  upload(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const f = input.files?.[0];
    if (!f) return;

    const fd = new FormData();
    fd.set('file', f);
    fd.set('label', 'upload-from-angular');

    this.run(() => this.bridge.request$({
      method: 'POST',
      url: '/api/file_assets/upload',
      body: fd,
    }));
  }

  private run<T>(factory: () => any): void {
    this.err.set(null);
    this.out.set(null);
    this.busy.set(true);

    factory()
      .subscribe({
        next: (v: T) => this.out.set(v),
        error: (e: any) => {
          this.err.set(e?.message || JSON.stringify(e));
          this.busy.set(false);
        },
        complete: () => this.busy.set(false),
      });
  }
}
