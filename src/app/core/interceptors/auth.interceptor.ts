import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  if (req.url.includes('/usuario/auth')) {
    return next(req);
  }

  const token = auth.getToken();
  if (!token) {
    return next(req);
  }

  if (auth.isTokenExpired()) {
    auth.handleSessionExpired();
    return throwError(
      () =>
        new HttpErrorResponse({
          status: 401,
          statusText: 'Session expired',
          url: req.url,
        }),
    );
  }

  return next(
    req.clone({
      setHeaders: {
        Authorization: token,
      },
    }),
  ).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        auth.handleSessionExpired();
      }
      return throwError(() => error);
    }),
  );
};
