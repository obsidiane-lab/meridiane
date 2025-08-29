import {Observable} from 'rxjs';

export type Iri = string | undefined;

export interface Item {
  '@id'?: Iri;
  '@context'?: string,
  '@type'?: string
}

export interface View {
  "@id": Iri;
  "hydra:first": string;
  "hydra:last": string;
  "hydra:next": string;
  "hydra:previous": string;
}


export interface Collection<T> {
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
  iri?: Iri;
  changes: Partial<T>;
}

export interface ResourceRepository<T> {
  list$(query?: Query): Observable<Collection<T>>;

  get$(iri: Iri): Observable<T>;

  create$(cmd: CreateCommand<T>): Observable<T>;

  update$(cmd: UpdateCommand<T>): Observable<T>;

  delete$(iri: Iri): Observable<void>;
}
