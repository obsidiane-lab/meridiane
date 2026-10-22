import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { Menu } from 'src/app/core/constants/menu';
import { MenuItem, SubMenuItem } from 'src/app/core/models/menu.model';

@Injectable({
  providedIn: 'root',
})
export class MenuService {
  private readonly _pagesMenu = signal<MenuItem[]>([]);
  readonly pagesMenu = this._pagesMenu.asReadonly();

  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    this._pagesMenu.set(this.applyActiveState(Menu.pages));

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this._pagesMenu.update((menus) => this.applyActiveState(menus));
      });
  }

  private applyActiveState(menus: MenuItem[]): MenuItem[] {
    return menus.map((menuGroup) => {
      let activeGroup = false;
      const items = menuGroup.items.map((item) => {
        const children = item.children ? this.applyActiveStateToChildren(item.children) : undefined;
        const active = this.isActive(item.route) || (children?.some((child) => child.active) ?? false);
        if (active) activeGroup = true;
        return {
          ...item,
          active,
          children,
        };
      });
      return {
        ...menuGroup,
        active: activeGroup,
        items,
      };
    });
  }

  private applyActiveStateToChildren(items: SubMenuItem[]): SubMenuItem[] {
    return items.map((item) => {
      const children = item.children ? this.applyActiveStateToChildren(item.children) : undefined;
      const active = this.isActive(item.route ?? undefined);

      return {
        ...item,
        active: active || (children?.some((child) => child.active) ?? false),
        children,
      };
    });
  }

  private isActive(instruction: string | null | undefined): boolean {
    if (!instruction) {
      return false;
    }
    return this.router.isActive(this.router.createUrlTree([instruction]), {
      paths: instruction === '/' ? 'exact' : 'subset',
      queryParams: 'ignored',
      fragment: 'ignored',
      matrixParams: 'ignored',
    });
  }
}
