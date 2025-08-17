import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { toHttpParams } from './query-builder';
import {
    Collection,
    CreateCommand,
    Id,
    Query,
    ResourceRepository,
    UpdateCommand
} from '../../ports/resource-repository.port';


export class ApiPlatformRestRepository<TDomain> implements ResourceRepository<TDomain> {
    constructor(
        private readonly http: HttpClient,
        private readonly apiBase: string,
        private readonly resourcePath: string,                           // ex: '/books'
    ) {}

    list(query?: Query): Observable<Collection<TDomain>> {
        return this.http.get<any>(`${this.apiBase}${this.resourcePath}`, { params: toHttpParams(query) });
    }

    get(id: Id): Observable<TDomain> {
        return this.http.get<TDomain>(`${this.apiBase}${this.resourcePath}/${id}`);
    }

    create(cmd: CreateCommand<TDomain>): Observable<TDomain> {
        return this.http.post<TDomain>(`${this.apiBase}${this.resourcePath}`, cmd.payload);
    }

    update(cmd: UpdateCommand<TDomain>): Observable<TDomain> {
        return this.http.patch<TDomain>(`${this.apiBase}${this.resourcePath}/${cmd.id}`, cmd.changes);
    }

    delete(id: Id): Observable<void> {
        return this.http.delete<void>(`${this.apiBase}${this.resourcePath}/${id}`);
    }
}