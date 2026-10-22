import { Injectable } from '@angular/core';
import type { Conversation } from 'bridge';
import { BaseEntityStore } from 'src/app/core/stores/base-entity.store';

@Injectable({ providedIn: 'root' })
export class ConversationStore extends BaseEntityStore<Conversation> {}
