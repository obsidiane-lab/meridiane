import {Item} from '../lib/ports/resource-repository.port';
import { Conversation } from './Conversation';

export interface MessageInput extends Item {
  conversation?: Conversation;
  senderId?: string;
  originalText?: string;
  sourceLang?: string;
  targetLang?: string;
}
