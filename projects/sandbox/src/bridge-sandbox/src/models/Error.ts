import {Item} from '../lib/ports/resource-repository.port';

export interface Error extends Item {
  title?: string;
  detail?: string;
  status?: number;
  instance?: any;
  type?: string;
}
