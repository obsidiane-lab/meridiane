import {HttpHeaders, HttpParams} from '@angular/common/http';
import {Observable} from 'rxjs';

export type Iri = string | undefined;

type BaseHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD';
export type HttpMethod = BaseHttpMethod | Lowercase<BaseHttpMethod>;

export type QueryParamValue = string | number | boolean | Array<string | number | boolean>;
export type AnyQuery = Query | Record<string, QueryParamValue> | HttpParams;

export interface Item {
  '@id'?: Iri;
  '@context'?: string,
  '@type'?: string
}

export interface View extends Item{
  first?: Iri;
  last?: Iri;
  next?: Iri;
  previous?: Iri;
}
export interface IriTemplateMapping extends Item {
  variable: string;
  property?: string;
  required?: boolean;
}
export interface IriTemplate extends Item {
  template: string;
  variableRepresentation?: string;
  mapping: IriTemplateMapping[];
}
export interface Collection<T> extends Item {
  member: T[];
  totalItems?: number;
  search?: IriTemplate;
  view?: View;
}

export interface Query {
  itemsPerPage?: number;
  page?: number;
  filters?: Record<string, QueryParamValue>;
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

  request$<R = unknown, B = unknown>(req: HttpRequestConfig<B>): Observable<R>;
}

export interface HttpRequestConfig<TBody = unknown> {
  method: HttpMethod;
  url?: Iri;
  query?: AnyQuery;
  body?: TBody;
  headers?: HttpHeaders | Record<string, string>;
  responseType?: 'json' | 'text' | 'blob';
  withCredentials?: boolean;
  options?: Record<string, unknown>;
}
