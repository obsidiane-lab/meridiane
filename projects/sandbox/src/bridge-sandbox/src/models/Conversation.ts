import {Item} from '../lib/ports/resource-repository.port';

export interface Conversation extends Item {
  id?: number;
  externalId?: string;
  messages?: string[];
}
