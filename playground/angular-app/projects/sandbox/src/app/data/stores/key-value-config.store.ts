import {Injectable} from '@angular/core';
import {BaseEntityStore} from './base-entity.store';
import type {KeyValueConfigKvRead as KeyValueConfig} from '@obsidiane/bridge-sandbox';

@Injectable({providedIn: 'root'})
export class KeyValueConfigStore extends BaseEntityStore<KeyValueConfig> {}
