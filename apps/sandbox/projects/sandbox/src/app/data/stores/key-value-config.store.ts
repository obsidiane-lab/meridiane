import {Injectable} from '@angular/core';
import {BaseEntityStore} from './base-entity.store';
import type {KeyValueConfig} from '@obsidiane/bridge-sandbox';

@Injectable({providedIn: 'root'})
export class KeyValueConfigStore extends BaseEntityStore<KeyValueConfig> {}
