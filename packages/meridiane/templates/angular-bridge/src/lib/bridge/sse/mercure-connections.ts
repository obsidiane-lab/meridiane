import {BehaviorSubject, Observable, Subject} from 'rxjs';
import {takeUntil} from 'rxjs/operators';
import {
  BridgeLogger,
  MercureConnectionMode,
  RealtimeDiagnostics,
} from '../../bridge.types';
import {RealtimeStatus} from '../../ports/realtime.port';
import {EventSourceWrapper} from './eventsource-wrapper';
import {MercureUrlBuilder} from './mercure-url.builder';

export type IncomingMessage = {type: string; data: string; lastEventId?: string};

type ConnectionScope = 'shared' | 'dedicated';

type ManagedConnection = {
  id: string;
  key: string;
  scope: ConnectionScope;
  groupId?: string;
  topics: ReadonlySet<string>;
  urlLength: number;
  wrapper: EventSourceWrapper;
  stop$: Subject<void>;
  status: RealtimeStatus;
};

type ConnectionTarget = Subject<IncomingMessage>;

type ConnectionManagerOptions = {
  hubUrl?: string;
  withCredentials: boolean;
  mode: MercureConnectionMode;
  maxUrlLength: number;
  logger?: BridgeLogger;
  destroy$: Observable<void>;
  nextId: (prefix: string) => string;
};

export class MercureConnectionManager {
  private readonly urlBuilder = new MercureUrlBuilder();
  private readonly connections = new Map<string, ManagedConnection>();
  private readonly sharedConnections = new Map<string, ManagedConnection>();
  private readonly dedicatedGroups = new Map<string, Set<string>>();
  private readonly lastEventIdByKey = new Map<string, string>();

  private readonly statusSubject = new BehaviorSubject<RealtimeStatus>('closed');
  private readonly diagnosticsSubject: BehaviorSubject<RealtimeDiagnostics>;

  readonly status$ = this.statusSubject.asObservable();
  readonly diagnostics$: Observable<RealtimeDiagnostics>;

  constructor(private readonly options: ConnectionManagerOptions) {
    this.diagnosticsSubject = new BehaviorSubject<RealtimeDiagnostics>(this.createDiagnostics());
    this.diagnostics$ = this.diagnosticsSubject.asObservable();
  }

  reconcileShared(topics: Iterable<string>, target: ConnectionTarget): void {
    if (!this.options.hubUrl) {
      this.closeShared();
      return;
    }

    const desiredConnections = new Map<string, ReadonlySet<string>>();
    for (const partition of this.partitionTopics(topics)) {
      const partitionTopics = new Set(partition);
      desiredConnections.set(this.connectionKey(partitionTopics, 'shared'), partitionTopics);
    }

    for (const [key, connection] of [...this.sharedConnections.entries()]) {
      if (!desiredConnections.has(key)) this.close(connection.id);
    }

    for (const [key, partitionTopics] of desiredConnections) {
      if (this.sharedConnections.has(key)) continue;
      const connection = this.open({key, scope: 'shared', topics: partitionTopics, target});
      this.sharedConnections.set(key, connection);
    }
  }

  openDedicated(groupId: string, topics: Iterable<string>, target: ConnectionTarget): void {
    this.dedicatedGroups.set(groupId, new Set());

    for (const partition of this.partitionTopics(topics)) {
      const partitionTopics = new Set(partition);
      const key = this.connectionKey(partitionTopics, 'dedicated', groupId);
      const connection = this.open({key, scope: 'dedicated', groupId, topics: partitionTopics, target});
      this.dedicatedGroups.get(groupId)?.add(connection.id);
    }
  }

  closeShared(): void {
    for (const connection of [...this.sharedConnections.values()]) this.close(connection.id);
  }

  closeDedicated(groupId: string): void {
    const connectionIds = this.dedicatedGroups.get(groupId);
    if (!connectionIds) return;

    for (const connectionId of [...connectionIds]) this.close(connectionId);
    this.dedicatedGroups.delete(groupId);
  }

  closeAll(): void {
    for (const connection of [...this.connections.values()]) this.close(connection.id);
    this.sharedConnections.clear();
    this.dedicatedGroups.clear();
    this.updateStatus();
  }

  complete(): void {
    this.statusSubject.complete();
    this.diagnosticsSubject.complete();
  }

  private partitionTopics(topics: Iterable<string>): string[][] {
    if (!this.options.hubUrl) return [];
    return this.urlBuilder.partitionTopics(
      this.options.hubUrl,
      topics,
      this.options.maxUrlLength,
      this.options.mode === 'auto'
    );
  }

  private open(params: {
    key: string;
    scope: ConnectionScope;
    topics: ReadonlySet<string>;
    target: ConnectionTarget;
    groupId?: string;
  }): ManagedConnection {
    const {hubUrl, withCredentials, logger, destroy$, nextId} = this.options;
    if (!hubUrl) throw new Error('Mercure hub URL is required to open a realtime connection.');

    const lastEventId = this.lastEventIdByKey.get(params.key);
    const url = this.urlBuilder.build(hubUrl, params.topics, lastEventId);

    logger?.debug?.('[Mercure] connect', {
      mode: this.options.mode,
      scope: params.scope,
      key: params.key,
      urlLength: url.length,
      topics: [...params.topics],
      lastEventId,
    });

    const wrapper = new EventSourceWrapper(url, {withCredentials}, logger);
    const stop$ = new Subject<void>();
    const connection: ManagedConnection = {
      id: nextId('conn'),
      key: params.key,
      scope: params.scope,
      groupId: params.groupId,
      topics: params.topics,
      urlLength: url.length,
      wrapper,
      stop$,
      status: 'connecting',
    };

    this.connections.set(connection.id, connection);

    wrapper.status$
      .pipe(takeUntil(stop$), takeUntil(destroy$))
      .subscribe((status) => {
        connection.status = status;
        this.updateStatus();
      });

    wrapper.events$
      .pipe(takeUntil(stop$), takeUntil(destroy$))
      .subscribe((event) => {
        if (event.lastEventId) this.lastEventIdByKey.set(params.key, event.lastEventId);
        params.target.next({type: event.type, data: event.data, lastEventId: event.lastEventId});
      });

    try {
      wrapper.open();
      this.updateStatus();
      return connection;
    } catch (error) {
      this.close(connection.id);
      throw error;
    }
  }

  private close(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    connection.status = 'closed';
    connection.wrapper.close();
    connection.stop$.next();
    connection.stop$.complete();
    this.connections.delete(connectionId);

    if (connection.scope === 'shared') this.sharedConnections.delete(connection.key);
    if (connection.scope === 'dedicated' && connection.groupId) {
      const group = this.dedicatedGroups.get(connection.groupId);
      group?.delete(connection.id);
      if (group?.size === 0) this.dedicatedGroups.delete(connection.groupId);
      this.lastEventIdByKey.delete(connection.key);
    }

    this.updateStatus();
  }

  private connectionKey(topics: ReadonlySet<string>, scope: ConnectionScope, groupId = ''): string {
    const {hubUrl = '', withCredentials, mode} = this.options;
    return [
      scope,
      groupId,
      hubUrl,
      withCredentials ? '1' : '0',
      mode,
      [...topics].sort().join('|'),
    ].join('::');
  }

  private updateStatus(): void {
    const statuses = [...this.connections.values()].map((connection) => connection.status);
    this.statusSubject.next(aggregateStatus(statuses));
    this.diagnosticsSubject.next(this.createDiagnostics());
  }

  private createDiagnostics(): RealtimeDiagnostics {
    const connections = [...this.connections.values()]
      .map((connection) => ({
        id: connection.id,
        scope: connection.scope,
        status: connection.status,
        topicCount: connection.topics.size,
        topics: [...connection.topics].sort(),
        urlLength: connection.urlLength,
      }))
      .sort((left, right) => left.scope.localeCompare(right.scope) || left.id.localeCompare(right.id));
    const sharedConnections = connections.filter((connection) => connection.scope === 'shared').length;

    return {
      mode: this.options.mode,
      maxUrlLength: this.options.maxUrlLength,
      totalConnections: connections.length,
      sharedConnections,
      dedicatedConnections: connections.length - sharedConnections,
      connections,
    };
  }
}

function aggregateStatus(statuses: RealtimeStatus[]): RealtimeStatus {
  if (statuses.includes('connected')) return 'connected';
  if (statuses.includes('connecting')) return 'connecting';
  return 'closed';
}
