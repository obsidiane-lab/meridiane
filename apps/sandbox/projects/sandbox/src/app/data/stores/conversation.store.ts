import {Injectable} from '@angular/core';
import type {ConversationConversationRead as Conversation} from '@obsidiane/bridge-sandbox';
import {BaseEntityStore} from './base-entity.store';

@Injectable({providedIn: 'root'})
export class ConversationStore extends BaseEntityStore<Conversation> {}
