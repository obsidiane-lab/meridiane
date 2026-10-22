import {IriRequired, Item, ResourceRepository} from '../ports/resource-repository.port';
import {Observable} from 'rxjs';
import {ResourceEvent} from '../bridge/sse/resource-topic';

export interface Facade<T extends Item> extends ResourceRepository<T> {
  watch$(iri?: IriRequired): Observable<ResourceEvent<T>>;
}
