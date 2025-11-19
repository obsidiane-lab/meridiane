import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {toHttpParams} from './query-builder';
import {
  Collection,
  CreateCommand,
  Iri, Item,
  Query,
  ResourceRepository,
  UpdateCommand
} from '../../ports/resource-repository.port';
import {CredentialsPolicy} from '../credentials.policy';


export class ApiPlatformRestRepository<T extends Item> implements ResourceRepository<T> {
  private readonly credentialsPolicy: CredentialsPolicy;

  constructor(
    private readonly http: HttpClient,
    private readonly apiBase: string,
    private readonly resourcePath: Iri,
    readonly init: string,
  ) {
    this.credentialsPolicy = new CredentialsPolicy(init);
  }

  list$(query?: Query): Observable<Collection<T>> {
    return this.http.get<any>(`${this.apiBase}${this.resourcePath}`, {
      params: toHttpParams(query),
      withCredentials: this.credentialsPolicy.withCredentials()
    });
  }

  get$(iri: Iri): Observable<T> {
    return this.http.get<T>(`${this.apiBase}${iri}`, {
      withCredentials: this.credentialsPolicy.withCredentials()
    });
  }

  create$(cmd: CreateCommand<T>): Observable<T> {
    return this.http.post<T>(`${this.apiBase}${this.resourcePath}`, cmd.payload, {
      withCredentials: this.credentialsPolicy.withCredentials()
    });
  }

  update$(cmd: UpdateCommand<T>): Observable<T> {
    return this.http.patch<T>(`${this.apiBase}${cmd.iri}`, cmd.changes, {
      withCredentials: this.credentialsPolicy.withCredentials()
    });
  }

  delete$(iri: Iri): Observable<void> {
    return this.http.delete<void>(`${this.apiBase}${iri}`, {
      withCredentials: this.credentialsPolicy.withCredentials()
    });
  }
}
