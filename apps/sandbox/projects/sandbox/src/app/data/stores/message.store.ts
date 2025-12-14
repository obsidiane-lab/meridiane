import {Injectable} from '@angular/core';
import {Message} from '../../entities/message';
import {BaseEntityStore} from './base-entity.store';

@Injectable({providedIn: 'root'})
export class MessageStore extends BaseEntityStore<Message> {}

