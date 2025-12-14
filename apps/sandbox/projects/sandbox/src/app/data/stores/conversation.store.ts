import {Injectable} from '@angular/core';
import {Conversation} from '../../entities/conversation';
import {BaseEntityStore} from './base-entity.store';

@Injectable({providedIn: 'root'})
export class ConversationStore extends BaseEntityStore<Conversation> {}

