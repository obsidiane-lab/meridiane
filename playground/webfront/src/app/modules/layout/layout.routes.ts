import { Routes } from '@angular/router';
import { LayoutComponent } from './layout.component';

export const layoutRoutes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'conversations' },
      {
        path: 'conversations',
        data: { breadcrumb: 'menu.items.conversations' },
        loadComponent: () =>
          import('../conversations/pages/conversations/conversations.component').then((m) => m.ConversationsComponent),
      },
    ],
  },
  { path: '**', redirectTo: '/errors/404' },
];
