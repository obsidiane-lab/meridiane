import { Component, computed, input, output, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideSearch } from '@ng-icons/lucide';
import { TranslatePipe } from '@ngx-translate/core';
import type { BrnDialogState } from '@spartan-ng/brain/dialog';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCommandImports } from '@spartan-ng/helm/command';
import type { MenuItem, SubMenuItem } from 'src/app/core/models/menu.model';

type NavigationCommandItem = {
  labelKey: string;
  route: string;
};

type NavigationCommandGroup = {
  labelKey: string;
  items: NavigationCommandItem[];
};

@Component({
  selector: 'app-navigation-command',
  imports: [NgIcon, TranslatePipe, HlmButton, HlmCommandImports],
  providers: [provideIcons({ lucideSearch })],
  templateUrl: './navigation-command.component.html',
  host: {
    class: 'block min-w-0',
    '(document:keydown)': 'handleKeyboardShortcut($event)',
  },
})
export class NavigationCommandComponent {
  readonly groups = input.required<readonly MenuItem[]>();
  readonly navigated = output<string>();

  protected readonly state = signal<BrnDialogState>('closed');
  protected readonly search = signal('');
  protected readonly commandGroups = computed<NavigationCommandGroup[]>(() =>
    this.groups()
      .map((group) => ({
        labelKey: group.group,
        items: this.flattenItems(group.items),
      }))
      .filter((group) => group.items.length > 0),
  );

  protected open(): void {
    this.search.set('');
    this.state.set('open');
  }

  protected setState(state: BrnDialogState): void {
    this.state.set(state);
  }

  protected navigate(route: string): void {
    this.search.set('');
    this.state.set('closed');
    this.navigated.emit(route);
  }

  protected handleKeyboardShortcut(event: KeyboardEvent): void {
    if (event.repeat || event.key.toLowerCase() !== 'k' || (!event.ctrlKey && !event.metaKey)) {
      return;
    }

    event.preventDefault();
    const nextState = this.state() === 'open' ? 'closed' : 'open';
    if (nextState === 'open') {
      this.search.set('');
    }
    this.state.set(nextState);
  }

  private flattenItems(items: readonly SubMenuItem[]): NavigationCommandItem[] {
    return items.flatMap((item) => {
      const current = item.route && item.label ? [{ labelKey: item.label, route: item.route }] : [];
      return [...current, ...this.flattenItems(item.children ?? [])];
    });
  }
}
