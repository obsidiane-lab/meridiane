import {Item} from '../lib/ports/resource-repository.port';

export interface ConstraintViolationJson extends Item {
  status?: number;
  violations?: { propertyPath?: string; message?: string; }[];
  detail?: string;
  type?: string;
  title?: any;
  instance?: any;
}
