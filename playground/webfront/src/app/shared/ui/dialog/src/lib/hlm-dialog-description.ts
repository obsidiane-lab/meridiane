import { Directive } from '@angular/core';
import { BrnDialogDescription } from '@spartan-ng/brain/dialog';
import { classes } from '@spartan-ng/helm/utils';

@Directive({
  selector: '[hlmDialogDescription]',
  hostDirectives: [BrnDialogDescription],
  host: { 'data-slot': 'dialog-description' },
})
export class HlmDialogDescription {
  constructor() {
    classes(() => 'text-sm text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground');
  }
}
