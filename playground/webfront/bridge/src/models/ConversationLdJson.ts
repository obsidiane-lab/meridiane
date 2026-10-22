import type { Item } from '../lib/ports/resource-repository.port';

export interface ConversationLdJson extends Item {
  id?: number;
  title: string;
  messages?: string[];
  createdAt?: string;
}
