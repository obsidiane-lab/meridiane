import {Iri, Item, ResourceRepository} from '../ports/resource-repository.port';
import {Observable} from 'rxjs';
import {ResourceDeletion} from '../bridge/sse/resource-topic';
import {RealtimeSubscribeOptions} from '../ports/realtime.port';

export interface Facade<T extends Item> extends ResourceRepository<T> {
  watch$(iri?: Iri, options?: RealtimeSubscribeOptions): Observable<T | ResourceDeletion>;
}
