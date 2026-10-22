import { Component, input } from '@angular/core';

@Component({
  selector: 'app-page-header',
  templateUrl: './page-header.component.html',
  host: { class: 'block' },
})
export class PageHeaderComponent {
  readonly headingLevel = input<1 | 2>(1);
  readonly title = input.required<string>();
  readonly description = input<string | null>();
}
