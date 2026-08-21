import { Routes } from '@angular/router';
import {HomeComponent} from './ui/home/home.component';
import {ConversationsLabComponent} from './ui/conversations/conversations-lab.component';
import {MessagesLabComponent} from './ui/messages/messages-lab.component';
import {LoginComponent} from './ui/login/login.component';
import {authGuard} from './core/auth.guard';
import {HttpLabComponent} from './ui/http/http-lab.component';
import {WatchTypesLabComponent} from './ui/watch-types/watch-types-lab.component';

export const routes: Routes = [
  { path: 'home', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'conversations', component: ConversationsLabComponent, canActivate: [authGuard] },
  { path: 'conversations/:id/messages', component: MessagesLabComponent, canActivate: [authGuard] },
  { path: 'http', component: HttpLabComponent, canActivate: [authGuard] },
  { path: 'watch-types', component: WatchTypesLabComponent, canActivate: [authGuard] },
  { path: '', pathMatch: 'full', redirectTo: 'home' },
  { path: '**', redirectTo: 'home' },
];
