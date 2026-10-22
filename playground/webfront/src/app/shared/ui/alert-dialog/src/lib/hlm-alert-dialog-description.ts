import { Directive } from '@angular/core';
import { BrnAlertDialogDescription } from '@spartan-ng/brain/alert-dialog';
import { classes } from '@spartan-ng/helm/utils';

@Directive({
  selector: '[hlmAlertDialogDescription]',
  hostDirectives: [BrnAlertDialogDescription],
  host: { 'data-slot': 'alert-dialog-description' },
})
export class HlmAlertDialogDescription {
  constructor() {
    classes(
      () =>
        'text-sm text-balance text-muted-foreground md:text-pretty *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground',
    );
  }
}
