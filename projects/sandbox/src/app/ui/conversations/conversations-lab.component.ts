import {Component, computed, signal, WritableSignal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {Router} from "@angular/router";
import {ResourceFacade} from '../../../bridge-sandbox/src/lib/facades/resource.facade';
import {FacadeFactory} from '../../../bridge-sandbox/src/lib/facades/facade.factory';
import {Message} from '../../entities/message';
import {Conversation} from '../../entities/conversation';
import {Iri} from '../../../bridge-sandbox/src/lib/ports/resource-repository.port';
import {upsertInSignal} from '../../../bridge-sandbox/src/lib/utils/utils';

interface LogEntry {
  t: number;
  kind: 'init' | 'select' | 'update' | 'patch' | 'put' | 'manual-get';
  iri?: Iri | undefined;
  snapshot?: unknown;
}

@Component({
  selector: 'app-conversations-lab',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './conversations-lab.component.html',
  styleUrls: ['./conversations-lab.component.css'],
})
export class ConversationsLabComponent {
  readonly facade: ResourceFacade<Conversation>;

  // Signals façade
  readonly conversations: WritableSignal<readonly Conversation[]> = signal<readonly Conversation[]>([])
  readonly status

  // Sélection & formulaire
  readonly selectedId = signal<Iri | undefined>(undefined);
  formExternalId = '';

  // Logs
  private readonly _logs = signal<LogEntry[]>([]);
  readonly logs = this._logs.asReadonly();

  // Conversation sélectionnée
  readonly selected = computed<Conversation | null>(() => {
    const iri = this.selectedId();
    if (!iri) return null;
    return this.conversations().find(c => c['@id'] === iri) ?? null;
  });

  constructor(private router: Router, protected facadeFactory: FacadeFactory) {

    this.facade = facadeFactory.create<Conversation>({url: `/api/conversations`})

    this.status = this.facade.connectionStatus;
  }

  routing() {
    this.router.navigate(["/messages"]);
  }

  // Actions toolbar
  load() {
    this.facade.list$({page: 1, itemsPerPage: 20})
      .subscribe(list => {
        console.log('list', list);
        this.conversations.set(list.member)
      });
  }

  watchAll() {
    this.facade.watch$(this.conversations().map(conversation => conversation['@id'])).subscribe(result => {
        upsertInSignal(this.conversations, result)
      }
    );
  }

  unwatchAll() {
    this.facade.unwatch(this.conversations().map(conversation => conversation['@id']));
  }

  select(c: Conversation) {
    this.selectedId.set(c['@id']);
    this.formExternalId = c.externalId ?? '';
    this.pushLog({t: Date.now(), kind: 'select', iri: c['@id'], snapshot: c});
    this.facade.watchSubResource$<Message>([c["@id"]!], 'conversation').subscribe(message => {
      this.facade.get$(c['@id']).subscribe()
    })
  }

  watchOne() {
    const iri = this.selectedId();
    if (iri) {
      this.facade.watch$(iri);
    }
  }

  unwatchOne() {
    const id = this.selectedId();
    if (id) this.facade.unwatch(id);
  }

  manualGet() {
    const iri = this.selectedId();
    if (!iri) return;
    this.facade.get$(iri).subscribe(res => {
      this.pushLog({t: Date.now(), kind: 'manual-get', iri, snapshot: res});
    });
  }

  patchExternalId() {
    const iri = this.selectedId();
    if (!iri) return;
    const ext = this.formExternalId?.trim();
    this.facade.update$({iri, changes: {externalId: ext}}).subscribe(res => {
      this.pushLog({t: Date.now(), kind: 'patch', iri, snapshot: res});
    });
  }

  // utils logs
  private pushLog(entry: LogEntry) {
    const arr = this._logs();
    const next = [...arr, entry];
    if (next.length > 200) next.splice(0, next.length - 200);
    this._logs.set(next);
  }
}
