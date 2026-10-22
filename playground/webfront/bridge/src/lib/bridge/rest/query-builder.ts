import {HttpParams} from '@angular/common/http';
import {AnyQuery, Query, QueryParamValue} from '../../ports/resource-repository.port';

export function toHttpParams(query: AnyQuery | undefined): HttpParams {
  if (!query) return new HttpParams();
  if (query instanceof HttpParams) return query;

  const fromObject: Record<string, string | string[]> = {};

  const consumed = new Set<string>();
  const maybeQuery = query as Query;
  if (maybeQuery.page != null) {
    fromObject['page'] = String(maybeQuery.page);
    consumed.add('page');
  }
  if (maybeQuery.itemsPerPage != null) {
    fromObject['itemsPerPage'] = String(maybeQuery.itemsPerPage);
    consumed.add('itemsPerPage');
  }

  if (query.filters) {
    consumed.add('filters');
    for (const [key, value] of Object.entries(query.filters)) {
      assign(fromObject, key, value);
    }
  }

  for (const [key, value] of Object.entries(query as Record<string, QueryParamValue>)) {
    if (consumed.has(key)) continue;
    assign(fromObject, key, value);
  }

  return new HttpParams({fromObject});
}

function assign(target: Record<string, string | string[]>, key: string, value: QueryParamValue | undefined) {
  if (value == null) return;
  if (Array.isArray(value)) {
    target[key] = value.map(String);
  } else {
    target[key] = String(value);
  }
}
