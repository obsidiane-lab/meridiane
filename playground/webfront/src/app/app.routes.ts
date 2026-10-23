import { Routes } from '@angular/router';

export const appRoutes: Routes = [
  {
    path: 'errors',
    loadChildren: () => import('./modules/error/error.routes').then((m) => m.errorRoutes),
  },
  {
    path: '',
    loadChildren: () => import('./modules/layout/layout.routes').then((m) => m.layoutRoutes),
  },
  { path: '**', redirectTo: 'errors/404' },
];
