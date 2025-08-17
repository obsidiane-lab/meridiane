import {ReplaySubject, Subject} from 'rxjs';
import {SseEvent, SseOptions, RealtimeStatus} from '../../ports/realtime.port';

export class EventSourceWrapper {
    private es?: EventSource;

    private readonly statusSub = new ReplaySubject<RealtimeStatus>(1);
    private readonly eventSub = new Subject<SseEvent>();

    readonly status$ = this.statusSub.asObservable();
    readonly events$ = this.eventSub.asObservable();

    /** Activer pour conversations local */
    private readonly debug = false;

    constructor(
        private readonly url: string,
        private readonly opts: SseOptions = {}
    ) {
        this.setState('closed');
        this.log('[SSE] initialized', url, opts);
    }

    open(): void {
        if (this.es) {
            this.log('[SSE] open() ignored: already open');
            return;
        }

        this.setState('connecting');
        this.log('[SSE] creating EventSource');

        const es = new EventSource(this.url, {
            withCredentials: !!this.opts.withCredentials,
        });
        this.es = es;

        es.onopen = () => {
            this.setState('connected');
        };

        es.onmessage = (ev) => {
            this.log('[SSE] event', ev);
            this.log('[SSE] message', ev.data);
            this.eventSub.next({type: 'message', data: ev.data, lastEventId: ev.lastEventId || undefined});
        };

        es.onerror = () => {
            // Le navigateur va retenter. On reste en "connecting".
            this.log('[SSE] error → retrying (browser)');
            this.setState('connecting');
        };
    }

    close(): void {
        if (this.es) {
            this.es.close();
            this.es = undefined;
            this.log('[SSE] closed');
        }
        this.setState('closed');
    }

    // ──────────────── internals ────────────────

    private setState(state: RealtimeStatus): void {
        this.log('[SSE] state', state);
        this.statusSub.next(state);
    }

    private log(...args: unknown[]): void {
        if (this.debug) console.log(...args);
    }
}
