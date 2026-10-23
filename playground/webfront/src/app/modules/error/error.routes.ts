import { Routes } from '@angular/router';
import { ErrorComponent } from './error.component';
import { Error404Component } from './pages/error404/error404.component';

export const errorRoutes: Routes = [
  {
    path: '',
    component: ErrorComponent,
    children: [
      { path: '', redirectTo: '404', pathMatch: 'full' },
      {
        path: '404',
        component: Error404Component,
      },
      {
        path: '500',
        loadComponent: () => import('./pages/error500/error500.component').then((m) => m.Error500Component),
      },
      { path: '**', redirectTo: '404' },
    ],
  },
];
