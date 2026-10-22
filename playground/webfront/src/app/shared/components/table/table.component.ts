import { Component, TemplateRef, contentChild, effect, input, linkedSignal, output, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideInbox } from '@ng-icons/lucide';
import type { Collection, Query } from 'bridge';
import { FormGroup } from '@angular/forms';
import { TableFooterComponent } from './components/table-footer/table-footer.component';
import { TableActionComponent } from './components/table-action/table-action.component';
import type { TableFilters } from './components/table-action/table-action.component';
import { NgTemplateOutlet } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { firstValueFrom, isObservable } from 'rxjs';
import type { Observable } from 'rxjs';
import type { TableFetch, TableQuery } from './table.types';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmEmptyImports } from '@spartan-ng/helm/empty';
import { HlmSeparatorImports } from '@spartan-ng/helm/separator';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { HlmTableImports } from '@spartan-ng/helm/table';

@Component({
  selector: 'app-table',
  imports: [
    TableFooterComponent,
    TableActionComponent,
    NgIcon,
    NgTemplateOutlet,
    TranslatePipe,
    HlmCardImports,
    HlmEmptyImports,
    HlmSeparatorImports,
    HlmSpinnerImports,
    HlmTableImports,
  ],
  providers: [provideIcons({ lucideInbox })],
  templateUrl: './table.component.html',
  host: { class: 'block' },
})
export class TableComponent<T> {
  readonly framed = input(true);
  readonly callBackDataFetch = input.required<TableFetch<T>>();
  readonly searchFilterKey = input('search');
  readonly filtersForm = input<FormGroup>();

  readonly actionTemplate = contentChild('actionTemplate', { read: TemplateRef });
  readonly headerTemplate = contentChild.required('headerTemplate', { read: TemplateRef });
  readonly rowTemplate = contentChild.required('rowTemplate', { read: TemplateRef });
  readonly filtersTemplate = contentChild('filtersTemplate', { read: TemplateRef });

  readonly trackBy = input<(item: T, index: number) => string | number>();

  readonly currentPage = input(1);
  readonly itemsPerPage = input(10);
  readonly searchPage = input('');

  readonly queryChange = output<TableQuery>();

  protected readonly currentPageState = linkedSignal(() => this.currentPage());
  protected readonly itemsPerPageState = linkedSignal(() => this.itemsPerPage());
  protected readonly searchPageState = linkedSignal(() => this.searchPage());
  private readonly reloadRequest = signal(0);

  protected readonly isLoading = signal(false);
  protected readonly filtersState = signal<TableFilters>({});
  protected readonly displayData = signal<T[]>([]);
  protected readonly totalItems = signal(0);
  private requestId = 0;
  private lastQueryKey = '';

  constructor() {
    effect(() => {
      const fetchPage = this.callBackDataFetch();
      const tableQuery = this.buildTableQuery();
      this.reloadRequest();
      void this.fetchData(fetchPage, tableQuery);
    });
  }

  protected onSearchChange(search: string): void {
    this.searchPageState.set(search);
    this.currentPageState.set(1);
  }

  protected onFiltersChange(filters: TableFilters): void {
    this.filtersState.set(this.cloneFilters(filters));
    this.currentPageState.set(1);
  }

  protected onPageChange(page: number): void {
    this.currentPageState.set(page);
  }

  protected onItemsPerPageChange(itemsPerPage: number): void {
    this.itemsPerPageState.set(itemsPerPage);
    this.currentPageState.set(1);
  }

  public reload(): void {
    this.lastQueryKey = '';
    this.reloadRequest.update((request) => request + 1);
  }

  private buildTableQuery(): TableQuery {
    return {
      page: this.currentPageState(),
      itemsPerPage: this.itemsPerPageState(),
      search: this.searchPageState().trim(),
      filters: this.cloneFilters(this.filtersState()),
    };
  }

  private async fetchData(fetchPage: TableFetch<T>, tableQuery: TableQuery): Promise<void> {
    const bridgeQuery = this.buildBridgeQuery(tableQuery);
    const queryKey = JSON.stringify(bridgeQuery);
    if (queryKey === this.lastQueryKey) {
      return;
    }
    this.lastQueryKey = queryKey;
    this.queryChange.emit(tableQuery);

    const requestId = ++this.requestId;
    this.isLoading.set(true);

    try {
      const result = await this.resolveFetch(fetchPage(bridgeQuery));
      if (requestId !== this.requestId) {
        return;
      }
      const member = result.member ?? [];
      this.displayData.set(member);
      this.totalItems.set(result.totalItems ?? member.length);
    } catch (error) {
      if (requestId === this.requestId) {
        console.error('TableComponent: fetch failed', error);
      }
    } finally {
      if (requestId === this.requestId) {
        this.isLoading.set(false);
      }
    }
  }

  private buildBridgeQuery(query: TableQuery): Query {
    const filters = this.cloneFilters(query.filters);
    if (query.search.length > 0) {
      filters[this.searchFilterKey()] = query.search;
    }
    const bridgeQuery: Query = {
      page: Math.max(1, query.page),
      itemsPerPage: Math.max(1, query.itemsPerPage),
    };
    if (Object.keys(filters).length > 0) {
      bridgeQuery.filters = filters;
    }
    return bridgeQuery;
  }

  private async resolveFetch(result: Observable<Collection<T>> | Promise<Collection<T>>): Promise<Collection<T>> {
    if (isObservable(result)) {
      return await firstValueFrom(result);
    }
    return await result;
  }

  protected trackRow(item: T, index: number): string | number {
    const trackBy = this.trackBy();
    if (trackBy) {
      return trackBy(item, index);
    }
    if (typeof item === 'string' || typeof item === 'number') {
      return item;
    }
    if (item && typeof item === 'object') {
      const record = item as Record<string, unknown>;
      const id = record['id'] ?? record['@id'] ?? record['iri'] ?? record['uuid'];
      if (typeof id === 'string' || typeof id === 'number') {
        return id;
      }
    }
    return index;
  }

  private cloneFilters(source: TableFilters | null | undefined): TableFilters {
    const result: TableFilters = {};
    if (!source) {
      return result;
    }
    for (const [key, value] of Object.entries(source)) {
      if (value === undefined || value === null) {
        continue;
      }
      result[key] = Array.isArray(value) ? [...value] : value;
    }
    return result;
  }
}
