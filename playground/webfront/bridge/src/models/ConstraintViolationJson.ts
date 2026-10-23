
export interface ConstraintViolationJson {
  status?: number;
  violations?: { propertyPath: string; message: string; code?: string; hint?: string; payload?: { [key: string]: any; }; }[];
  detail?: string;
  type?: string;
  title?: string | null;
  instance?: string | null;
}
