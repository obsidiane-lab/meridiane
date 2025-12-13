import {
  Collection,
  CreateCommand,
  HttpRequestConfig,
  Iri,
  Item,
  Query,
  UpdateCommand
} from "../ports/resource-repository.port";
import {Observable} from "rxjs";

export interface Facade<T extends Item> {

  list$(query?: Query): Observable<Collection<T>>;

  get$(iri: Iri): Observable<T>;

  create$(cmd: CreateCommand<T>): Observable<T>;

  update$(cmd: UpdateCommand<T>): Observable<T>;

  delete$(iri: Iri): Observable<void>;

  post$<R = unknown, B = unknown>(req: RestRequest<B>): Observable<R>;
  put$<R = unknown, B = unknown>(req: RestRequest<B>): Observable<R>;
  patch$<R = unknown, B = unknown>(req: RestRequest<B>): Observable<R>;

  request$<R = unknown, B = unknown>(req: HttpRequestConfig<B>): Observable<R>;

  watch$(iri: Iri|Iri[]): Observable<T>;

  unwatch(iri: Iri|Iri[]): void;
}

export type RestRequest<B> = Omit<HttpRequestConfig<B>, 'method'>;
