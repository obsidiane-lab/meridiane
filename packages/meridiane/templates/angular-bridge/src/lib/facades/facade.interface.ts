import {
  Collection,
  HttpRequestConfig,
  Iri,
  IriRequired,
  Item,
  HttpCallOptions,
  AnyQuery,
} from '../ports/resource-repository.port';
import {Observable} from 'rxjs';
import {WatchConnectionOptions} from '../bridge.types';

export interface Facade<T extends Item> {
  getCollection$(query?: AnyQuery, opts?: HttpCallOptions): Observable<Collection<T>>;

  get$(iri: IriRequired, opts?: HttpCallOptions): Observable<T>;

  post$(payload: Partial<T>, opts?: HttpCallOptions): Observable<T>;

  patch$(iri: IriRequired, changes: Partial<T>, opts?: HttpCallOptions): Observable<T>;

  put$(iri: IriRequired, payload: Partial<T>, opts?: HttpCallOptions): Observable<T>;

  delete$(iri: IriRequired, opts?: HttpCallOptions): Observable<void>;

  request$<R = unknown, B = unknown>(req: HttpRequestConfig<B>): Observable<R>;

  watch$(iri: Iri | Iri[], options?: WatchConnectionOptions): Observable<T>;

  unwatch(iri: Iri | Iri[]): void;
}
