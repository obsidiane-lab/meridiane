import {
  Iri,
  Item,
  ResourceRepository,
} from '../ports/resource-repository.port';
import {Observable} from 'rxjs';
import {WatchConnectionOptions} from '../bridge.types';

export interface Facade<T extends Item> extends ResourceRepository<T> {
  watch$(iri: Iri | Iri[], options?: WatchConnectionOptions): Observable<T>;

  unwatch(iri: Iri | Iri[]): void;
}
