import {Observable} from 'rxjs';

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
  subscribe$<T>(iris: string[], filter?: SubscribeFilter): Observable<RealtimeEvent<T>>;

  unsubscribe(iris: string[]): void;

  status$(): Observable<RealtimeStatus>;
}
