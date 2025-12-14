import {ReplaySubject, Subject} from 'rxjs';
import {SseEvent, SseOptions, RealtimeStatus} from '../../ports/realtime.port';
import {BridgeLogger} from '../../bridge.types';

export class EventSourceWrapper {
  private es?: EventSource;

  private readonly statusSub = new ReplaySubject<RealtimeStatus>(1);
  private readonly eventSub = new Subject<SseEvent>();

  readonly status$ = this.statusSub.asObservable();
  readonly events$ = this.eventSub.asObservable();

  constructor(
    private readonly url: string,
    private readonly opts: SseOptions = {},
    private readonly logger?: BridgeLogger,
  ) {
    this.setState('closed');
    this.log('[SSE] init', {url, withCredentials: !!opts.withCredentials});
  }

  open(): void {
    if (this.es) {
      this.log('[SSE] open() ignored: already open');
      return;
    }

    this.setState('connecting');
    this.log('[SSE] open', {url: this.url});

    const es = new EventSource(this.url, {
      withCredentials: !!this.opts.withCredentials,
    });
    this.es = es;

    es.onopen = () => {
      this.setState('connected');
    };

    es.onmessage = (ev) => {
      this.eventSub.next({type: 'message', data: ev.data, lastEventId: ev.lastEventId || undefined});
    };

    es.onerror = () => {
      // The browser will retry automatically. We stay in "connecting".
      this.log('[SSE] error');
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
    this.statusSub.next(state);
  }

  private log(...args: unknown[]): void {
    this.logger?.debug?.(...args);
  }
}
