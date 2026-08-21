import {CanActivateFn, Router} from '@angular/router';
import {inject} from '@angular/core';
import {AuthStateService} from './auth-state.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthStateService);
  const router = inject(Router);
  if (auth.token()) return true;
  return router.parseUrl('/login');
};

