import {Item} from '@obsidiane/bridge-sandbox';

export interface KeyValueConfig extends Item {
  id?: number;
  name?: string;
  values?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string | null;
}

