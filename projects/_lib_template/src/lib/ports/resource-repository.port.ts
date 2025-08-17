import {Observable} from 'rxjs';

export type Id = string | number;

export interface Item {
    '@id'?: string;
    '@context'?: string,
    '@type'?: string
}

export interface View {
    "@id": string;
    "hydra:first": string;
    "hydra:last": string;
    "hydra:next": string;
    "hydra:previous": string;
}


export interface Collection<T> extends Item {
    member: T[];
    search?: object;
    totalItems?: number;
    page: number;
    view: View;
}

export interface Query {
    page?: number;
    itemsPerPage?: number;
    order?: Record<string, 'asc' | 'desc'>;
    filters?: Record<string, string | number | boolean | Array<string | number | boolean>>;
}


export interface CreateCommand<T> {
    payload: T;
}

export interface UpdateCommand<T> {
    id: Id;
    changes: Partial<T>;
}

export interface ResourceRepository<T> {
    list(query?: Query): Observable<Collection<T>>;

    get(id: Id): Observable<T>;

    create(cmd: CreateCommand<T>): Observable<T>;

    update(cmd: UpdateCommand<T>): Observable<T>;

    delete(id: Id): Observable<void>;
}
