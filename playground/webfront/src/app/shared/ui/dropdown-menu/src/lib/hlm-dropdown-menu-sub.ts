import { CdkMenu } from '@angular/cdk/menu';
import { Directive, ElementRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { deriveMenuSideFromTransformOrigin, MENU_SIDE, type MenuSide } from '@spartan-ng/brain/core';
import { classes } from '@spartan-ng/helm/utils';

@Directive({
  selector: '[hlmDropdownMenuSub],hlm-dropdown-menu-sub',
  hostDirectives: [CdkMenu],
  host: {
    'data-slot': 'dropdown-menu-sub',
    '[attr.data-state]': '_state()',
    '[attr.data-side]': '_side()',
  },
})
export class HlmDropdownMenuSub {
  private readonly _host = inject(CdkMenu);
  private readonly _elementRef = inject(ElementRef<HTMLElement>);
  // The sub-trigger provides its configured side; CDK parents this content's injector under it.
  private readonly _menuSide = inject(MENU_SIDE, { optional: true });

  protected readonly _state = signal('open');
  protected readonly _side = signal<MenuSide>(this._menuSide?.side() ?? 'right');

  constructor() {
    this.setSideFromTransformOrigin();
    // this is a best effort, but does not seem to work currently
    // TODO: figure out a way for us to know the host is about to be closed. might not be possible with CDK
    this._host.closed.pipe(takeUntilDestroyed()).subscribe(() => this._state.set('closed'));

    classes(
      () =>
        'w-auto min-w-24 rounded-lg bg-popover p-1 text-popover-foreground shadow-lg ring-1 ring-foreground/10 duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:fade-in-0 data-open:zoom-in-95 motion-safe:data-open:animate-in data-closed:fade-out-0 data-closed:zoom-out-95 motion-safe:data-closed:animate-out',
    );
  }

  private setSideFromTransformOrigin() {
    const side = this._menuSide?.side() ?? 'right';
    // CDK sets transform-origin on this element synchronously on attach; read it next tick and derive side
    setTimeout(() => {
      this._side.set(deriveMenuSideFromTransformOrigin(this._elementRef.nativeElement.style.transformOrigin, side));
    });
  }
}
