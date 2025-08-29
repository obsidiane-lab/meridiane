import {Observable} from 'rxjs';
import {Iri} from './resource-repository.port';

export type RealtimeStatus = 'connecting' | 'connected' | 'closed';

export interface SseEvent {
  type: string;
  data: string;
  lastEventId?: string;
}

export interface SseOptions {
  withCredentials?: boolean;
  listen?: string[];
}


export interface RealtimeEvent<T> {
  iri: string;
  data?: T;
}

export type SubscribeFilter = {
  field: string;
};


export interface RealtimePort {
  subscribe$<T>(iris: Iri[], filter?: SubscribeFilter): Observable<RealtimeEvent<T>>;

  unsubscribe(iris: Iri[]): void;

  status$(): Observable<RealtimeStatus>;
}
