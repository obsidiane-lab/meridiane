import {Injectable} from '@angular/core';
import {BaseEntityStore} from './base-entity.store';
import {User} from '../../entities/user';

@Injectable({providedIn: 'root'})
export class UserStore extends BaseEntityStore<User> {}

