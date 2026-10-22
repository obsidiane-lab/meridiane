import { Directive } from '@angular/core';
import { BrnFieldControlDescribedBy } from '@spartan-ng/brain/field';
import { BrnTextarea } from '@spartan-ng/brain/textarea';
import { classes } from '@spartan-ng/helm/utils';

@Directive({
  selector: '[hlmTextarea]',
  hostDirectives: [{ directive: BrnTextarea, inputs: ['id', 'forceInvalid'] }, BrnFieldControlDescribedBy],
  host: { 'data-slot': 'textarea' },
})
export class HlmTextarea {
  constructor() {
    classes(
      () =>
        'flex field-sizing-content min-h-16 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 data-[matches-spartan-invalid=true]:border-destructive data-[matches-spartan-invalid=true]:ring-3 data-[matches-spartan-invalid=true]:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:data-[matches-spartan-invalid=true]:border-destructive/50 dark:data-[matches-spartan-invalid=true]:ring-destructive/40',
    );
  }
}
