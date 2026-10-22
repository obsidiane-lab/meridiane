import { Directive } from '@angular/core';
import { BrnCommandSeparator } from '@spartan-ng/brain/command';
import { classes } from '@spartan-ng/helm/utils';

@Directive({
  selector: '[hlmCommandSeparator],hlm-command-separator',
  hostDirectives: [BrnCommandSeparator],
  host: {
    'data-slot': 'command-separator',
  },
})
export class HlmCommandSeparator {
  constructor() {
    classes(() => '-mx-1 block h-px bg-border data-hidden:hidden');
  }
}
