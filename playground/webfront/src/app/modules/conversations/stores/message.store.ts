import { Injectable } from '@angular/core';
import type { Message } from 'bridge';
import { BaseEntityStore } from 'src/app/core/stores/base-entity.store';

@Injectable({ providedIn: 'root' })
export class MessageStore extends BaseEntityStore<Message> {}
