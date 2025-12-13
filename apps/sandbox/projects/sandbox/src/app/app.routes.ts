import { Routes } from '@angular/router';
import {ConversationsLabComponent} from './ui/conversations/conversations-lab.component';
import {MessagesLabComponent} from './ui/messages/messages-lab.component';

export const routes: Routes = [
  { path: '', component: ConversationsLabComponent },
  { path: 'messages', component: MessagesLabComponent },
];
