import {HttpParams} from '@angular/common/http';
import {Query} from '../../ports/resource-repository.port';

export function toHttpParams(q: Query | undefined): HttpParams {
    if (!q) return new HttpParams();

    const fromObject: Record<string, string | string[]> = {};
    if (q.page != null) fromObject['page'] = String(q.page);
    if (q.itemsPerPage != null) fromObject['itemsPerPage'] = String(q.itemsPerPage);

    if (q.filters) {
        for (const [k, v] of Object.entries(q.filters)) {
            if (Array.isArray(v)) fromObject[k] = v.map(String);
            else fromObject[k] = String(v);
        }
    }

    return new HttpParams({fromObject});
}
