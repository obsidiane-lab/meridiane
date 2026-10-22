import type { Collection, Query } from 'bridge';
import type { Observable } from 'rxjs';
import type { TableFilters } from './components/table-action/table-action.component';

export interface TableQuery {
  page: number;
  itemsPerPage: number;
  search: string;
  filters: TableFilters;
}

export type TableFetch<T> = (query: Query) => Observable<Collection<T>> | Promise<Collection<T>>;
