import {Item} from '../lib/ports/resource-repository.port';

export interface Message extends Item {
  id?: number;
  conversation?: string;
  originalText?: string;
  translatedText?: any;
  sourceLang?: string;
  targetLang?: string;
  createdAt?: Date;
  senderId?: string;
}
