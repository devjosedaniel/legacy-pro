import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { PermisoService } from '../services/permiso.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }

  if (auth.getToken()) {
    auth.handleSessionExpired();
  }

  return router.createUrlTree(['/login']);
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree([inject(PermisoService).firstAllowedRoute()]);
};

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated() && auth.user()?.role === 'admin') {
    return true;
  }

  return router.createUrlTree(['/dashboard/inventario']);
};

export function permisoGuard(slug: string): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const permisos = inject(PermisoService);
    const router = inject(Router);

    if (!auth.isAuthenticated()) {
      return router.createUrlTree(['/login']);
    }

    if (permisos.can(slug)) {
      return true;
    }

    return router.createUrlTree([permisos.firstAllowedRoute()]);
  };
}
