import {Item} from '@obsidiane/bridge-sandbox';

export interface User extends Item {
  id?: number;
  email?: string;
  roles?: string[];
  password?: string;
  displayName?: string | null;
  createdAt?: string;
  updatedAt?: string | null;
}

