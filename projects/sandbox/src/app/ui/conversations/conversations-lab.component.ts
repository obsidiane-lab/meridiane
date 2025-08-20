import {Component, computed, signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import type {Conversation} from '../../entities/conversation';
import {Router} from "@angular/router";
import {ResourceFacade} from '../../../bridge-sandbox/src/lib/facades/resource.facade';
import {FacadeFactory} from '../../../bridge-sandbox/src/lib/facades/facade.factory';

interface LogEntry {
  t: number;
  kind: 'init' | 'select' | 'update' | 'patch' | 'put' | 'manual-get';
  id?: string | null;
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
  readonly conversations
  readonly loading
  readonly status

  // Sélection & formulaire
  readonly selectedId = signal<string | null>(null);
  formExternalId = '';

  // Logs
  private readonly _logs = signal<LogEntry[]>([]);
  readonly logs = this._logs.asReadonly();

  // Conversation sélectionnée
  readonly selected = computed<Conversation | null>(() => {
    const id = this.selectedId();
    if (!id) return null;
    return this.conversations().find(c => c.id === id) ?? null;
  });

  constructor(private router: Router, protected facadeFactory: FacadeFactory) {

    this.facade = facadeFactory.create<Conversation>({url: `/api/conversations`})

    this.conversations = this.facade.items;
    this.loading = this.facade.loading;
    this.status = this.facade.connectionStatus;
  }

  routing() {
    this.router.navigate(["/messages"]);
  }

  // Actions toolbar
  load() {
    this.facade.list({page: 1, itemsPerPage: 20});
  }

  watchAll() {
    this.facade.watchAll();
  }

  unwatchAll() {
    this.facade.unwatchAll();
  }

  select(c: Conversation) {
    this.selectedId.set(c.id);
    this.formExternalId = c.externalId ?? '';
    this.pushLog({t: Date.now(), kind: 'select', id: c.id, snapshot: c});
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
    const id = this.selectedId();
    if (!id) return;
    this.facade.get(id).subscribe(res => {
      this.pushLog({t: Date.now(), kind: 'manual-get', id, snapshot: res});
    });
  }

  patchExternalId() {
    const id = this.selectedId();
    if (!id) return;
    const ext = this.formExternalId?.trim();
    this.facade.update({id, changes: {externalId: ext}}).subscribe(res => {
      this.pushLog({t: Date.now(), kind: 'patch', id, snapshot: res});
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
