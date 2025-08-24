import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {toHttpParams} from './query-builder';
import {
  Collection,
  CreateCommand,
  Id,
  Query,
  ResourceRepository,
  UpdateCommand
} from '../../ports/resource-repository.port';
import {CredentialsPolicy} from '../credentials.policy';


export class ApiPlatformRestRepository<TDomain> implements ResourceRepository<TDomain> {
  private readonly credentialsPolicy: CredentialsPolicy;

  constructor(
    private readonly http: HttpClient,
    private readonly apiBase: string,
    private readonly resourcePath: string,
    private readonly init: string,
  ) {
    this.credentialsPolicy = new CredentialsPolicy(this.init);
  }

  list$(query?: Query): Observable<Collection<TDomain>> {
    return this.http.get<any>(`${this.apiBase}${this.resourcePath}`, {
      params: toHttpParams(query),
      withCredentials: this.credentialsPolicy.withCredentials()
    });
  }

  get$(id: Id): Observable<TDomain> {
    return this.http.get<TDomain>(`${this.apiBase}${this.resourcePath}/${id}`, {
      withCredentials: this.credentialsPolicy.withCredentials()
    });
  }

  create$(cmd: CreateCommand<TDomain>): Observable<TDomain> {
    return this.http.post<TDomain>(`${this.apiBase}${this.resourcePath}`, cmd.payload, {
      withCredentials: this.credentialsPolicy.withCredentials()
    });
  }

  update$(cmd: UpdateCommand<TDomain>): Observable<TDomain> {
    return this.http.patch<TDomain>(`${this.apiBase}${this.resourcePath}/${cmd.id}`, cmd.changes, {
      withCredentials: this.credentialsPolicy.withCredentials()
    });
  }

  delete$(id: Id): Observable<void> {
    return this.http.delete<void>(`${this.apiBase}${this.resourcePath}/${id}`, {
      withCredentials: this.credentialsPolicy.withCredentials()
    });
  }
}
