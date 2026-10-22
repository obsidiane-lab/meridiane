import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { catchError, tap, throwError } from 'rxjs';
import { FacadeFactory, isResourceDeletion, type Message, type Iri } from 'bridge';
import { iriOf } from 'src/app/core/utils/iri.util';
import { MessageStore } from '../stores/message.store';

@Injectable({ providedIn: 'root' })
export class MessageRepository {
  private readonly store = inject(MessageStore);
  private readonly facade = inject(FacadeFactory).create<Message>({ url: '/api/messages' });

  readonly entities = this.store.entities();

  $entity(iri: Iri | undefined) {
    return this.store.entity(iri);
  }

  ensure(iri: Iri): void {
    if (this.store.entity(iri)().state === 'idle') {
      this.fetch$(iri).subscribe({ error: () => undefined });
    }
  }

  fetch$(iri: Iri) {
    const previous = this.store.entity(iri)().value;
    this.store.set(iri, { state: 'loading', value: previous });
    return this.facade.get$(iri).pipe(
      tap((entity) => this.store.upsert(entity)),
      catchError((error: unknown) => {
        const status = error instanceof HttpErrorResponse ? error.status : undefined;
        this.store.set(iri, {
          state: status === 404 ? 'notFound' : status === 403 ? 'forbidden' : 'error',
          value: status === 404 || status === 403 ? null : previous,
        });
        return throwError(() => error);
      }),
    );
  }

  create$(payload: Partial<Message>) {
    return this.facade.post$(payload).pipe(tap((entity) => this.store.upsert(entity)));
  }

  update$(iri: Iri, payload: Partial<Message>) {
    return this.facade.patch$(iri, payload).pipe(tap((entity) => this.store.upsert(entity)));
  }

  delete$(iri: Iri) {
    return this.facade.delete$(iri).pipe(tap(() => this.store.remove(iri)));
  }

  removeConversationMessages(conversationIri: Iri): void {
    for (const message of this.entities()) {
      if (message.conversation === conversationIri) this.store.remove(iriOf(message));
    }
  }

  watch$(iri?: Iri) {
    return this.facade.watch$(iri).pipe(
      tap((resource) => {
        if (isResourceDeletion(resource)) this.store.remove(resource['@id']);
        else this.store.upsert(resource);
      }),
    );
  }
}
