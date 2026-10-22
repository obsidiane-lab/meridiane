import { Directive } from '@angular/core';
import { BrnCommandItem } from '@spartan-ng/brain/command';
import { classes } from '@spartan-ng/helm/utils';

@Directive({
  selector: 'button[hlmCommandItem],button[hlm-command-item]',
  hostDirectives: [
    {
      directive: BrnCommandItem,
      inputs: ['value', 'disabled', 'id'],
      outputs: ['selected'],
    },
  ],
  host: {
    'data-slot': 'command-item',
  },
})
export class HlmCommandItem {
  constructor() {
    classes(
      () =>
        "group/command-item relative flex w-full cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none in-data-[slot=dialog-content]:rounded-lg! data-hidden:hidden data-selected:bg-muted data-selected:text-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_ng-icon:not([class*='text-'])]:text-[length:--spacing(4)] [&>ng-icon]:pointer-events-none [&>ng-icon]:shrink-0",
    );
  }
}
