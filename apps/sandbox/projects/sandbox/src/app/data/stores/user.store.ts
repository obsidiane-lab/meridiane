import {Injectable} from '@angular/core';
import {BaseEntityStore} from './base-entity.store';
import type {UserUserRead as User} from '@obsidiane/bridge-sandbox';

@Injectable({providedIn: 'root'})
export class UserStore extends BaseEntityStore<User> {}
