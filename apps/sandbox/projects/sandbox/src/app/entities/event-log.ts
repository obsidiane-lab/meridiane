import {Item} from '@obsidiane/bridge-sandbox';

export interface EventLog extends Item {
  id?: number;
  name?: string;
  payload?: any;
  createdAt?: string;
}

