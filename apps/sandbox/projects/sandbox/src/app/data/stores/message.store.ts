import {Injectable} from '@angular/core';
import type {MessageMessageRead as Message} from '@obsidiane/bridge-sandbox';
import {BaseEntityStore} from './base-entity.store';

@Injectable({providedIn: 'root'})
export class MessageStore extends BaseEntityStore<Message> {}
