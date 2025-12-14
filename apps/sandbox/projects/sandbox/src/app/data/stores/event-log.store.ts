import {Injectable} from '@angular/core';
import {BaseEntityStore} from './base-entity.store';
import type {EventLog} from '@obsidiane/bridge-sandbox';

@Injectable({providedIn: 'root'})
export class EventLogStore extends BaseEntityStore<EventLog> {}
