import {Component, input, signal} from '@angular/core';
import {CommonModule} from '@angular/common';

@Component({
  selector: 'app-json-viewer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './json-viewer.component.html',
  styleUrls: ['./json-viewer.component.css'],
})
export class JsonViewerComponent {
  readonly value = input<unknown>(null);
  readonly title = input<string>('Output');

  readonly copied = signal(false);

  copy(): void {
    const v = this.value();
    const text = v === null ? 'null' : JSON.stringify(v, null, 2);
    void navigator.clipboard.writeText(text).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 800);
    });
  }
}

