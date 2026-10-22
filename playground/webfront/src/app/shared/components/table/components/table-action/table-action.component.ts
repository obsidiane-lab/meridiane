import {
  Component,
  DestroyRef,
  TemplateRef,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { debounceTime } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import type { QueryParamValue } from 'bridge';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideListFilter } from '@ng-icons/lucide';
import type { BrnOverlayState } from '@spartan-ng/brain/overlay';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmPopoverImports } from '@spartan-ng/helm/popover';
import { HlmSeparatorImports } from '@spartan-ng/helm/separator';

export type TableFilters = Record<string, QueryParamValue>;
type QueryParamPrimitive = string | number | boolean;

@Component({
  selector: 'app-table-action',
  imports: [
    TranslatePipe,
    NgTemplateOutlet,
    ReactiveFormsModule,
    NgIcon,
    HlmBadgeImports,
    HlmButtonImports,
    HlmFieldImports,
    HlmInputImports,
    HlmPopoverImports,
    HlmSeparatorImports,
  ],
  providers: [provideIcons({ lucideListFilter })],
  templateUrl: './table-action.component.html',
  host: { class: 'block' },
})
export class TableActionComponent {
  private static nextId = 0;
  private readonly destroyRef = inject(DestroyRef);

  readonly filterChange = output<string>();

  readonly actionTemplate = input<TemplateRef<unknown> | null>(null);
  readonly filterTemplate = input<TemplateRef<unknown> | null>(null);
  readonly filters = model<TableFilters>({});
  readonly filtersForm = input<FormGroup>();
  readonly searchTerm = input('');

  private filtersSnapshot: Record<string, unknown> | null = null;

  protected readonly searchInputId = `app-table-search-${++TableActionComponent.nextId}`;
  protected readonly searchControl = new FormControl('', { nonNullable: true });
  protected readonly filterState = signal<BrnOverlayState>('closed');

  constructor() {
    effect(() => {
      const form = this.filtersForm();
      this.filtersSnapshot = form ? this.cloneDefaults(form.getRawValue() as Record<string, unknown>) : null;
    });
    effect(() => {
      const searchTerm = this.searchTerm();
      if (this.searchControl.value !== searchTerm) {
        this.searchControl.setValue(searchTerm, { emitEvent: false });
      }
    });
    this.searchControl.valueChanges
      .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.filterChange.emit(value));
  }

  protected onFilterStateChange(state: BrnOverlayState): void {
    this.filterState.set(state);
  }

  protected closeFiltersPanel(): void {
    this.filterState.set('closed');
  }

  protected onApplyFilters(): void {
    const filters = this.collectFiltersFromForm();
    this.filters.set(filters);
    this.closeFiltersPanel();
  }

  protected onResetFilters(): void {
    this.resetFiltersForm();
    const filters = this.collectFiltersFromForm();
    this.filters.set(filters);
  }

  protected readonly hasActiveFilters = computed(() => Object.keys(this.filters()).length > 0);

  private collectFiltersFromForm(): TableFilters {
    const raw = (this.filtersForm()?.getRawValue() ?? {}) as Record<string, unknown>;
    return this.normalizeFilters(raw);
  }

  private normalizeFilters = (raw: Record<string, unknown>): TableFilters => {
    const filters: TableFilters = {};

    Object.entries(raw).forEach(([key, value]) => {
      if (value === null || value === undefined) {
        return;
      }

      if (Array.isArray(value)) {
        const normalized = value
          .map((entry) => this.normalizeValue(entry))
          .filter((entry): entry is QueryParamPrimitive => entry !== null);
        if (!normalized.length) {
          return;
        }
        filters[key] = normalized;
        return;
      }

      const normalized = this.normalizeValue(value);
      if (normalized === null) {
        return;
      }
      filters[key] = normalized;
    });

    return filters;
  };

  private normalizeValue(value: unknown): QueryParamPrimitive | null {
    if (value === null || value === undefined) {
      return null;
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed.length ? trimmed : null;
    }
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : null;
    }
    if (typeof value === 'boolean') {
      return value;
    }
    return null;
  }

  private resetFiltersForm(): void {
    const form = this.filtersForm();
    if (!form) {
      return;
    }
    const defaults = this.filtersSnapshot ?? {};
    form.reset(this.cloneDefaults(defaults), { emitEvent: false });
    form.markAsPristine();
    form.markAsUntouched();
  }

  private cloneDefaults(source: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    Object.entries(source).forEach(([key, value]) => {
      result[key] = Array.isArray(value) ? [...value] : value;
    });
    return result;
  }
}
