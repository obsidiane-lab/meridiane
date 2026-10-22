import { Directive } from '@angular/core';
import { classes } from '@spartan-ng/helm/utils';

@Directive({
  selector: '[hlmBreadcrumbList]',
  host: {
    'data-slot': 'breadcrumb-list',
  },
})
export class HlmBreadcrumbList {
  constructor() {
    classes(() => 'flex flex-wrap items-center gap-1.5 text-sm wrap-break-word text-muted-foreground');
  }
}
