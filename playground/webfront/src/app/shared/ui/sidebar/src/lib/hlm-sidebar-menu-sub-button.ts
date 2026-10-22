import { type BooleanInput } from '@angular/cdk/coercion';
import { booleanAttribute, Directive, inject, input } from '@angular/core';
import { classes } from '@spartan-ng/helm/utils';
import { HlmSidebarService } from './hlm-sidebar.service';
import { injectHlmSidebarConfig } from './hlm-sidebar.token';

@Directive({
  selector: 'a[hlmSidebarMenuSubButton], button[hlmSidebarMenuSubButton]',
  host: {
    'data-slot': 'sidebar-menu-sub-button',
    'data-sidebar': 'menu-sub-button',
    '[attr.data-active]': 'isActive()',
    '[attr.data-size]': 'size()',
    '(click)': 'onClick()',
  },
})
export class HlmSidebarMenuSubButton {
  private readonly _sidebarService = inject(HlmSidebarService);
  private readonly _config = injectHlmSidebarConfig();

  public readonly closeMobileSidebarOnClick = input<boolean, BooleanInput>(
    this._config.closeMobileSidebarOnMenuButtonClick,
    { transform: booleanAttribute },
  );

  public readonly size = input<'sm' | 'md'>('md');
  public readonly isActive = input<boolean, BooleanInput>(false, { transform: booleanAttribute });

  constructor() {
    classes(
      () =>
        'flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 text-sidebar-foreground ring-sidebar-ring outline-hidden group-data-[collapsible=icon]:hidden hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[size=md]:text-sm data-[size=sm]:text-xs data-active:bg-sidebar-accent data-active:text-sidebar-accent-foreground [&>ng-icon]:shrink-0 [&>ng-icon]:text-[length:--spacing(4)] [&>span:last-child]:truncate [&>svg]:text-sidebar-accent-foreground',
    );
  }

  protected onClick(): void {
    if (this.closeMobileSidebarOnClick()) {
      this._sidebarService.setOpenMobile(false);
    }
  }
}
