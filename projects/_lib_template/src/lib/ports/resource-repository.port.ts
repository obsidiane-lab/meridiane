import {Observable} from 'rxjs';

export type Iri = string | undefined;

export interface Item {
  '@id'?: Iri;
  '@context'?: string,
  '@type'?: string
}

export interface View extends Item{
  first?: Iri;
  last?: Iri;
  next?: Iri;
  previous?: Iri;
}
export interface IriTemplateMapping extends Item {
  variable: string;
  property?: string;
  required?: boolean;
}
export interface IriTemplate extends Item {
  template: string;
  variableRepresentation?: string;
  mapping: IriTemplateMapping[];
}
export interface Collection<T> extends Item {
  member: T[];
  totalItems?: number;
  search?: IriTemplate;
  view?: View;
}

export interface Query {
  itemsPerPage?: number;
  page?: number;
  filters?: Record<string, string | number | boolean | Array<string | number | boolean>>;
}

export interface CreateCommand<T> {
  payload: T;
}

export interface UpdateCommand<T> {
  iri?: Iri;
  changes: Partial<T>;
}

export interface ResourceRepository<T> {
  list$(query?: Query): Observable<Collection<T>>;

  get$(iri: Iri): Observable<T>;

  create$(cmd: CreateCommand<T>): Observable<T>;

  update$(cmd: UpdateCommand<T>): Observable<T>;

  delete$(iri: Iri): Observable<void>;
}
