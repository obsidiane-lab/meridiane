import type { Item } from '../lib/ports/resource-repository.port';

export interface MessageLdJson extends Item {
  id?: number;
  conversation: string;
  content: string;
  createdAt?: string;
}
