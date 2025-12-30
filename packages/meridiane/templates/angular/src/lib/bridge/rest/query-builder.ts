import {HttpParams} from '@angular/common/http';
import {AnyQuery, Query, QueryParamValue} from '../../ports/resource-repository.port';

export function toHttpParams(q: AnyQuery | undefined): HttpParams {
  if (!q) return new HttpParams();
  if (q instanceof HttpParams) return q;

  const fromObject: Record<string, string | string[]> = {};

  const consumed = new Set<string>();
  const maybeQuery = q as Query;
  if (maybeQuery.page != null) {
    fromObject['page'] = String(maybeQuery.page);
    consumed.add('page');
  }
  if (maybeQuery.itemsPerPage != null) {
    fromObject['itemsPerPage'] = String(maybeQuery.itemsPerPage);
    consumed.add('itemsPerPage');
  }

  if (q.filters) {
    consumed.add('filters');
    for (const [k, v] of Object.entries(q.filters)) {
      assign(fromObject, k, v);
    }
  }

  for (const [k, v] of Object.entries(q as Record<string, QueryParamValue>)) {
    if (consumed.has(k)) continue;
    assign(fromObject, k, v);
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
