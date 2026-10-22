import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, PRIMARY_OUTLET, Router } from '@angular/router';
import type { ActivatedRouteSnapshot, Event } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { HlmBreadcrumbImports } from '@spartan-ng/helm/breadcrumb';
import { filter } from 'rxjs';

type BreadcrumbItem = Readonly<{
  current: boolean;
  label: string;
  url?: string;
}>;

type BreadcrumbLabel = false | string;

@Component({
  selector: 'app-breadcrumb',
  imports: [TranslatePipe, HlmBreadcrumbImports],
  templateUrl: './breadcrumb.component.html',
  host: { class: 'block min-w-0' },
})
export class BreadcrumbComponent {
  private readonly router = inject(Router);
  private readonly navigationEnd = toSignal(
    this.router.events.pipe(filter((event: Event): event is NavigationEnd => event instanceof NavigationEnd)),
    { initialValue: null },
  );

  protected readonly items = computed<BreadcrumbItem[]>(() => {
    this.navigationEnd();

    const items = this.buildFromRouter();
    return items.map((item, index) => ({
      ...item,
      current: index === items.length - 1,
      url: index === items.length - 1 ? undefined : item.url,
    }));
  });

  private buildFromRouter(): BreadcrumbItem[] {
    const items: BreadcrumbItem[] = [];
    let route: ActivatedRouteSnapshot | null = this.router.routerState.snapshot.root;
    let url = '';

    while (route) {
      const segments = route.url.map((segment) => segment.toString()).filter(Boolean);
      if (segments.length > 0) {
        url += `/${segments.join('/')}`;
      }

      const breadcrumb = route.routeConfig?.data?.['breadcrumb'] as BreadcrumbLabel | undefined;
      const label = typeof breadcrumb === 'string' ? breadcrumb.trim() : '';
      if (label) {
        items.push({ current: false, label, url: url || '/' });
      }

      route = route.children.find((child) => child.outlet === PRIMARY_OUTLET) ?? null;
    }

    return items;
  }
}
