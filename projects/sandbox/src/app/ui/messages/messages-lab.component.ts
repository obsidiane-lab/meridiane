import {Component, computed, Signal, signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {Router} from "@angular/router";

import {Conversation} from '../../entities/conversation';
import {Message} from '../../entities/message';

import {FacadeFactory, Iri, Item} from "../../../bridge-sandbox/src/public-api";
import {ResourceFacade} from "../../../bridge-sandbox/src/public-api";


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
  readonly messages : Signal<readonly  Message[]>;
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

    this.messages = this.facade.items;
    this.status = this.facade.connectionStatus;

    this.pushLog({t: Date.now(), kind: 'init'});


  }

  routing() {
    this.router.navigate(["/conversations"]);
  }

  load() {
    this.facade.list$({page: 1, itemsPerPage: 20});
  }

  watchAll() {
    this.facade.watchAll();
  }

  unwatchAll() {
    this.facade.unwatchAll();
  }

  select(c: Conversation) {
    this.selectedId.set(c["@id"]);
    this.formOriginalText = c.externalId ?? '';
    this.pushLog({t: Date.now(), kind: 'select', iri: c["@id"], snapshot: c});
  }

  watchOne() {
    const id = this.selectedId();
    if (id) this.facade.watchOne(id);
  }

  unwatchOne() {
    const id = this.selectedId();
    if (id) this.facade.unwatchOne(id);
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
