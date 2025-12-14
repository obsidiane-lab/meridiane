import {Injectable} from '@angular/core';
import {BaseEntityStore} from './base-entity.store';
import {KeyValueConfig} from '../../entities/key-value-config';

@Injectable({providedIn: 'root'})
export class KeyValueConfigStore extends BaseEntityStore<KeyValueConfig> {}

