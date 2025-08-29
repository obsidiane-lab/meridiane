import {Collection, CreateCommand, Iri, Item, Query, UpdateCommand} from "../ports/resource-repository.port";
import {Observable} from "rxjs";

export interface Facade<T extends Item> {

  dispose(): void;

  list$(query?: Query): Observable<Collection<T>>;

  get$(iri: Iri): Observable<T>;

  create$(cmd: CreateCommand<T>): Observable<T>;

  update$(cmd: UpdateCommand<T>): Observable<T>;

  delete$(iri: Iri): Observable<void>;

  watchAll(): void;

  unwatchAll(): void;

  watchOne(iri: Iri): void;

  unwatchOne(iri: Iri): void;
}
