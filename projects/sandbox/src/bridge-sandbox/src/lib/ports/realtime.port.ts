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

export interface RealtimePort<TPayload = unknown> {
    subscribe(iris: string[], parse: (raw: any) => RealtimeEvent<TPayload>): Observable<RealtimeEvent<TPayload>>;

    unsubscribe(iris: string[]): void;

    status(): Observable<RealtimeStatus>;

}