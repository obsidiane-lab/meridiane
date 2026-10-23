import type { Item } from '../lib/ports/resource-repository.port';

export interface ConstraintViolation extends Item {
  status?: number;
  violations?: { propertyPath: string; message: string; code?: string; hint?: string; payload?: { [key: string]: any; }; }[];
  detail?: string;
  description?: string;
  type?: string;
  title?: string | null;
  instance?: string | null;
}
