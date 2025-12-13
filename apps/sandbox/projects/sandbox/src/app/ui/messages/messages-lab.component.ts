import {Component, computed, Signal, signal, WritableSignal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {Router} from "@angular/router";

import {Conversation} from '../../entities/conversation';
import {Message} from '../../entities/message';

import {FacadeFactory, Iri, ResourceFacade} from "@obsidiane/bridge-sandbox";
import {tap} from 'rxjs';
import {upsertInSignal} from "@obsidiane/bridge-sandbox";

interface LogEntry {
  t: number;
  kind: 'init' | 'select' | 'update' | 'patch' | 'put' | 'manual-get';
  iri?: Iri | undefined;
  snapshot?: unknown;
}

@Component({
  selector: 'app-messages-lab',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './messages-lab.component.html',
  styleUrls: ['./messages-lab.component.css'],
})
export class MessagesLabComponent {

  readonly facade: ResourceFacade<Message>;
  // Signals façade
  readonly messages!: WritableSignal<readonly Message[]>;
  readonly status

  // Sélection & formulaire
  readonly selectedId = signal<Iri>(undefined);
  formOriginalText = '';

  // Logs
  private readonly _logs = signal<LogEntry[]>([]);
  readonly logs = this._logs.asReadonly();

  // Conversation sélectionnée
  readonly selected = computed<Conversation | null>(() => {
    const iri = this.selectedId();
    if (!iri) return null;
    return this.messages().find(c => c['@id'] === iri) ?? null;
  });

  constructor(private router: Router, protected facadeFactory: FacadeFactory) {
    this.facade = facadeFactory.create<Message>({url: `/api/conversations/1/messages`})
    this.status = this.facade.connectionStatus;
    this.pushLog({t: Date.now(), kind: 'init'});
  }

  routing() {
    this.router.navigate(["/conversations"]);
  }

  load() {
    this.facade.list$({page: 1, itemsPerPage: 20})
      .pipe(
        tap(list => {
          this.messages.set(list.member)
        })
      )
      .subscribe();
  }

  watchAll() {
    this.facade.watch$(this.messages().map(conversation => conversation['@id']));
  }

  unwatchAll() {
    this.facade.unwatch(this.messages().map(conversation => conversation['@id']));
  }

  select(c: Conversation) {
    this.selectedId.set(c["@id"]);
    this.formOriginalText = c.externalId ?? '';
    this.pushLog({t: Date.now(), kind: 'select', iri: c["@id"], snapshot: c});
  }

  watchOne() {
    const id = this.selectedId();
    if (id) this.facade.watch$(id).subscribe(result => {
      upsertInSignal(this.messages, result)
    });
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

  patchOriginalText() {
    const iri = this.selectedId();
    if (!iri) return;
    const ext = this.formOriginalText?.trim();
    this.facade.update$({
        iri,
        changes: {originalText: ext}
      }
    ).subscribe(res => {
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
