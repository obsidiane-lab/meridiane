import {Inject, Injectable, OnDestroy} from '@angular/core';
import {BehaviorSubject, Subject, Observable} from 'rxjs';
import {filter, map, share, takeUntil} from 'rxjs/operators';
import {API_BASE_URL, MERCURE_CONFIG, MERCURE_HUB_URL} from '../../tokens';
import {RealtimePort, RealtimeEvent, RealtimeStatus} from '../../ports/realtime.port';
import {EventSourceWrapper} from './eventsource-wrapper';
import {Item} from "../../ports/resource-repository.port";

@Injectable({providedIn: 'root'})
export class MercureRealtimeAdapter<T> implements RealtimePort<T>, OnDestroy {

    private readonly topics = new Set<string>();
    private lastEventId?: string;
    private es?: EventSourceWrapper;

    private readonly destroy$ = new Subject<void>();
    private connectionStop$ = new Subject<void>();

    private readonly status$ = new BehaviorSubject<RealtimeStatus>('closed');
    private readonly incoming$ = new Subject<{ type: string; data: string }>();


    constructor(
        @Inject(API_BASE_URL) private readonly apiBase: string,
        @Inject(MERCURE_CONFIG) private readonly init: string,
        @Inject(MERCURE_HUB_URL) private readonly hubUrl: string,
    ) {
    }

    // ──────────────── API publique ────────────────
    status(): Observable<RealtimeStatus> {
        return this.status$.asObservable();
    }

    subscribe(iris: string[]): Observable<RealtimeEvent<T>> {
        if (iris.length === 0) {
            return new Observable<RealtimeEvent<T>>((sub) => sub.complete());
        }

        iris.forEach((iri) => this.topics.add(iri));
        this.ensureConnected();

        const irisSet = new Set(iris);

        return this.incoming$.pipe(
            map(evt => this.safeParse(evt.data)),
            filter((payload: Item) => {
                const id = payload['@id'];
                return !!id && irisSet.has(id);
            }),
            map((payload) => {
                const iri = payload['@id']!;
                const data = payload;
                return {iri, data} as RealtimeEvent<T>;
            }),
            share()
        );
    }

    unsubscribe(iris: string[]): void {
        iris.forEach(iri => this.topics.delete(iri));
        this.ensureConnected();
    }

    ngOnDestroy(): void {
        this.teardownConnection();
        this.status$.complete();
        this.incoming$.complete();
        this.destroy$.next();
        this.destroy$.complete();
    }

    // ───────────────── PRIVATE ─────────────────

    private ensureConnected(): void {
        this.rebuildConnection();
    }

    private rebuildConnection(): void {
        this.teardownConnection();

        if (this.topics.size === 0) {
            this.status$.next('closed');
            return;
        }

        const url = this.buildHubUrlWithTopics(this.hubUrl!, this.topics);

        this.es = new EventSourceWrapper(url, {
            withCredentials: this.shouldUseCredentials(),
        });

        // nouveau cycle de vie pour cette connexion
        this.connectionStop$ = new Subject<void>();

        this.es.status$
            .pipe(takeUntil(this.connectionStop$), takeUntil(this.destroy$))
            .subscribe((st) => this.updateGlobalStatus(st));

        this.es.events$
            .pipe(takeUntil(this.connectionStop$), takeUntil(this.destroy$))
            .subscribe((e) => {
                this.lastEventId = e.lastEventId ?? this.lastEventId;

                this.incoming$.next(e);
            });

        this.status$.next('connecting');
        this.es.open();
    }

    /** Ferme la connexion courante et arrête ses streams */
    private teardownConnection(): void {
        this.es?.close();
        this.es = undefined;
        this.connectionStop$.next();
        this.connectionStop$.complete();
    }

    /** Mappe le statut SSE vers un statut global simple */
    private updateGlobalStatus(sse: RealtimeStatus): void {
        if (sse === 'connected') {
            this.status$.next('connected');
            return;
        }
        if (sse === 'connecting') {
            this.status$.next('connecting');
            return;
        }
        // 'closed' ou erreur → si on a des topics, on reste en "connecting"
        this.status$.next(this.topics.size > 0 ? 'connecting' : 'closed');
    }

    /** Construit l’URL d’abonnement avec les topics */
    private buildHubUrlWithTopics(hub: string, topics: Set<string>): string {
        const url = new URL(hub);
        if (this.lastEventId) {
            url.searchParams.set('lastEventID', this.lastEventId);
        }
        url.searchParams.delete('topic');
        topics.forEach((iri) => url.searchParams.append('topic', this.apiBase + iri));
        return url.toString();
    }

    /** Crédentials activés si demandés par la config */
    private shouldUseCredentials(): boolean {
        const c = this.init as any;
        return c?.withCredentials === true || c?.credentials === 'include';
    }

    // ──────────────── Utilitaires purs ────────────────

    private safeParse(raw: string): Item {
        return JSON.parse(raw) as Item;
    }
}
