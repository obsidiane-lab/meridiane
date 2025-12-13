import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {toHttpParams} from './query-builder';
import {
  Collection,
  CreateCommand,
  HttpRequestConfig,
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

  request$<R = unknown, B = unknown>(req: HttpRequestConfig<B>): Observable<R> {
    const {
      method,
      url,
      query,
      body,
      headers,
      responseType,
      withCredentials,
      options = {}
    } = req;

    const mergedOptions: any = {...options};
    const targetUrl = this.resolveUrl(url ?? this.resourcePath);

    const computedResponseType = responseType ?? mergedOptions.responseType ?? 'json';
    mergedOptions.responseType = computedResponseType as any;

    const credentials = withCredentials ?? mergedOptions.withCredentials ?? this.credentialsPolicy.withCredentials();
    mergedOptions.withCredentials = credentials;

    if (headers) mergedOptions.headers = headers;
    if (query) mergedOptions.params = toHttpParams(query as any);
    if (body !== undefined) mergedOptions.body = body;

    mergedOptions.observe = 'body';
    return this.http.request<R>(method, targetUrl, mergedOptions as { observe: 'body' });
  }

  private resolveUrl(path?: Iri): string {
    const effectivePath = path ?? this.resourcePath;
    if (!effectivePath) throw new Error('ApiPlatformRestRepository.resolveUrl: missing url and resourcePath');
    if (/^https?:\/\//i.test(effectivePath)) return effectivePath;
    if (effectivePath.startsWith('//')) return effectivePath;
    return joinUrl(this.apiBase, effectivePath);
  }
}

function joinUrl(base: string, path: string): string {
  const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}
