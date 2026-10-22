import {Component, DestroyRef, inject, signal} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {Observable, Subscription} from 'rxjs';
import {BridgeFacade, ResourceEvent} from '@obsidiane/bridge-sandbox';
import {JsonViewerComponent} from '../shared/json-viewer.component';
import {ConversationRepository} from '../../data/repositories/conversation.repository';
import {MessageRepository} from '../../data/repositories/message.repository';
import {UserRepository} from '../../data/repositories/user.repository';
import {EventLogRepository} from '../../data/repositories/event-log.repository';
import {FileAssetRepository} from '../../data/repositories/file-asset.repository';
import {KeyValueConfigRepository} from '../../data/repositories/key-value-config.repository';

interface WatchedResource {
  name: string;
  watch$: () => Observable<ResourceEvent<unknown>>;
  subscription?: Subscription;
}

interface ReceivedEvent {
  t: number;
  resource: string;
  kind: ResourceEvent<unknown>['kind'];
  iri: string;
}

/** Toggles resource watches and shows how they share the single Mercure connection. */
@Component({
  selector: 'app-realtime-lab',
  standalone: true,
  imports: [JsonViewerComponent],
  templateUrl: './realtime-lab.component.html',
})
export class RealtimeLabComponent {
  private readonly bridge = inject(BridgeFacade);
  private readonly conversations = inject(ConversationRepository);
  private readonly messages = inject(MessageRepository);
  private readonly users = inject(UserRepository);
  private readonly eventLogs = inject(EventLogRepository);
  private readonly fileAssets = inject(FileAssetRepository);
  private readonly keyValueConfigs = inject(KeyValueConfigRepository);

  readonly diagnostics = toSignal(this.bridge.realtimeDiagnostics$());
  readonly events = signal<ReceivedEvent[]>([]);

  readonly resources: WatchedResource[] = [
    {name: 'Conversation', watch$: () => this.conversations.watch$()},
    {name: 'Message', watch$: () => this.messages.watch$()},
    {name: 'User', watch$: () => this.users.watch$()},
    {name: 'EventLog', watch$: () => this.eventLogs.watch$()},
    {name: 'FileAsset', watch$: () => this.fileAssets.watch$()},
    {name: 'KeyValueConfig', watch$: () => this.keyValueConfigs.watch$()},
  ];

  constructor() {
    inject(DestroyRef).onDestroy(() => this.resources.forEach((resource) => resource.subscription?.unsubscribe()));
  }

  toggle(resource: WatchedResource): void {
    if (resource.subscription) {
      resource.subscription.unsubscribe();
      resource.subscription = undefined;
      return;
    }

    resource.subscription = resource.watch$().subscribe((event) => {
      this.events.update((events) => [
        {t: Date.now(), resource: resource.name, kind: event.kind, iri: event.iri},
        ...events,
      ].slice(0, 50));
    });
  }

  formatTime(t: number): string {
    return new Date(t).toLocaleTimeString();
  }
}
