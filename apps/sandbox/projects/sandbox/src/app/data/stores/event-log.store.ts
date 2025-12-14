import {Injectable} from '@angular/core';
import {BaseEntityStore} from './base-entity.store';
import {EventLog} from '../../entities/event-log';

@Injectable({providedIn: 'root'})
export class EventLogStore extends BaseEntityStore<EventLog> {}

