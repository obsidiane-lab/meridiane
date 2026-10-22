import { Component, DestroyRef, ElementRef, computed, inject, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Event, NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideBlocks,
  lucideChevronRight,
  lucideCircle,
  lucideInfo,
  lucideMessagesSquare,
  lucideMoon,
  lucideSun,
} from '@ng-icons/lucide';
import { TranslatePipe } from '@ngx-translate/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCollapsibleImports } from '@spartan-ng/helm/collapsible';
import { HlmSeparatorImports } from '@spartan-ng/helm/separator';
import { HlmSidebarImports, HlmSidebarService } from '@spartan-ng/helm/sidebar';
import { filter } from 'rxjs';
import type { MenuIcon } from 'src/app/core/models/menu.model';
import { FrontendConfigService } from 'src/app/core/services/frontend-config.service';
import { ThemeService } from 'src/app/core/services/theme.service';
import { BreadcrumbComponent } from 'src/app/shared/components/breadcrumb/breadcrumb.component';
import { NavigationCommandComponent } from 'src/app/shared/components/navigation-command/navigation-command.component';
import { MenuService } from './services/menu.service';

const MENU_ICON_NAMES: Record<MenuIcon, string> = {
  conversations: 'lucideMessagesSquare',
};

@Component({
  selector: 'app-layout',
  templateUrl: './layout.component.html',
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    TranslatePipe,
    NgIcon,
    HlmButtonImports,
    HlmCollapsibleImports,
    HlmSeparatorImports,
    HlmSidebarImports,
    BreadcrumbComponent,
    NavigationCommandComponent,
  ],
  providers: [
    provideIcons({
      lucideBlocks,
      lucideChevronRight,
      lucideCircle,
      lucideInfo,
      lucideMessagesSquare,
      lucideMoon,
      lucideSun,
    }),
  ],
})
export class LayoutComponent {
  private readonly mainContent = viewChild('mainContent', { read: ElementRef<HTMLElement> });
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly themeService = inject(ThemeService);
  private readonly sidebarService = inject(HlmSidebarService);

  protected readonly config = inject(FrontendConfigService).config;
  protected readonly menuService = inject(MenuService);
  protected readonly isDark = this.themeService.isDark;
  protected readonly isSidebarOpen = computed(() =>
    this.sidebarService.isMobile() ? this.sidebarService.openMobile() : this.sidebarService.open(),
  );
  protected readonly sidebarToggleLabelKey = computed(() =>
    this.isSidebarOpen() ? 'layout.nav.closeMenu' : 'layout.nav.openMenu',
  );

  constructor() {
    this.router.events
      .pipe(
        filter((event: Event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.mainContent()?.nativeElement.scrollTo({ top: 0 });
      });
  }

  protected menuIconName(icon: MenuIcon | undefined): string {
    return (icon && MENU_ICON_NAMES[icon]) || 'lucideCircle';
  }

  protected toggleTheme(): void {
    this.themeService.toggleMode();
  }

  protected navigate(route: string): void {
    void this.router.navigateByUrl(route);
  }
}
