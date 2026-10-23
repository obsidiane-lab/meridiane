import type { Item } from '../lib/ports/resource-repository.port';

export interface Error extends Item {
  title?: string | null;
  detail?: string | null;
  status?: number | null;
  instance?: string | null;
  type?: string;
  description?: string | null;
}
