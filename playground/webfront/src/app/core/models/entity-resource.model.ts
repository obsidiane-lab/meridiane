type EntityResourceState = 'idle' | 'loading' | 'ready' | 'notFound' | 'forbidden' | 'error' | 'deleted';

export type EntityResource<T> = {
  state: EntityResourceState;
  value: T | null;
};
