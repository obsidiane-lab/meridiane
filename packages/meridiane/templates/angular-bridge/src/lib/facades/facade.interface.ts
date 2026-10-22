import {IriRequired, Item, ResourceRepository} from '../ports/resource-repository.port';
import {Observable} from 'rxjs';
import {ResourceDeletion} from '../bridge/sse/resource-topic';

export interface Facade<T extends Item> extends ResourceRepository<T> {
  watch$(iri?: IriRequired): Observable<T | ResourceDeletion>;
}
