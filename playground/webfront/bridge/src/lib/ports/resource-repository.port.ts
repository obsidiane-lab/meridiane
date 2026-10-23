import {HttpHeaders, HttpParams} from '@angular/common/http';
import {Observable} from 'rxjs';

/** IRI of an API Platform resource (e.g. `/api/books/1`), or an absolute URL. */
export type Iri = string;

type BaseHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD';
export type HttpMethod = BaseHttpMethod | Lowercase<BaseHttpMethod>;

export type QueryParamValue = string | number | boolean | Array<string | number | boolean>;
export type AnyQuery = Query | Record<string, QueryParamValue> | HttpParams;

/** A resource read from the API, as described by API Platform's `HydraItemBaseSchema`. */
export interface Item {
  '@context'?: string | Record<string, unknown>;
  '@id': Iri;
  '@type': string;
}

/** Pagination of a collection (`view` of `HydraCollectionBaseSchema`). */
export interface View {
  '@id'?: Iri;
  '@type'?: string;
  first?: Iri | null;
  last?: Iri | null;
  previous?: Iri | null;
  next?: Iri | null;
}

export interface IriTemplateMapping {
  '@type'?: string;
  variable?: string;
  property?: string | null;
  required?: boolean;
}

/** Filters of a collection (`search` of `HydraCollectionBaseSchema`). */
export interface IriTemplate {
  '@type'?: string;
  template?: string;
  variableRepresentation?: string;
  mapping?: IriTemplateMapping[];
}

/** A collection, as described by API Platform's `HydraCollectionBaseSchema`. */
export interface Collection<T> {
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
  getCollection$(query?: AnyQuery, options?: HttpCallOptions): Observable<Collection<T>>;

  get$(iri: Iri, options?: HttpCallOptions): Observable<T>;

  post$(payload: Partial<T>, options?: HttpCallOptions): Observable<T>;

  patch$(iri: Iri, changes: Partial<T>, options?: HttpCallOptions): Observable<T>;

  put$(iri: Iri, payload: Partial<T>, options?: HttpCallOptions): Observable<T>;

  delete$(iri: Iri, options?: HttpCallOptions): Observable<void>;

  request$<R = unknown, B = unknown>(request: HttpRequestConfig<B>): Observable<R>;
}

export interface HttpRequestConfig<TBody = unknown> {
  method: HttpMethod;
  url?: Iri;
  query?: AnyQuery;
  body?: TBody;
  headers?: HttpHeaders | Record<string, string>;
  responseType?: 'json' | 'text' | 'blob';
  withCredentials?: boolean;
}
