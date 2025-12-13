import {HttpHeaders, HttpParams} from '@angular/common/http';
import {Observable} from 'rxjs';

export type Iri = string | undefined;
export type IriRequired = string;

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

export interface HttpCallOptions {
  headers?: HttpHeaders | Record<string, string>;
  withCredentials?: boolean;
}

export interface ResourceRepository<T> {
  getCollection$(query?: AnyQuery, opts?: HttpCallOptions): Observable<Collection<T>>;

  get$(iri: IriRequired, opts?: HttpCallOptions): Observable<T>;

  post$(payload: Partial<T>, opts?: HttpCallOptions): Observable<T>;

  patch$(iri: IriRequired, changes: Partial<T>, opts?: HttpCallOptions): Observable<T>;

  put$(iri: IriRequired, payload: Partial<T>, opts?: HttpCallOptions): Observable<T>;

  delete$(iri: IriRequired, opts?: HttpCallOptions): Observable<void>;

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
