import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, map, Observable, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse } from '../models/api.model';
import { LoginCredentials, User } from '../models/user.model';
import { extractApiError, mapUsuario } from '../utils/api.mappers';

const SESSION_KEY = 'inventario_session';
const TOKEN_KEY = 'inventario_token';
const TOKEN_EXP_KEY = 'inventario_token_exp';
const SESSION_EXPIRED_KEY = 'inventario_session_expired';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly currentUser = signal<User | null>(this.loadSession());
  private sessionExpiredHandled = false;
  private expiryTimer: ReturnType<typeof setInterval> | null = null;

  readonly user = this.currentUser.asReadonly();

  constructor() {
    if (this.currentUser() && this.getToken() && !this.isTokenExpired()) {
      this.startSessionWatch();
    }
  }

  isAuthenticated(): boolean {
    return this.currentUser() !== null && !!this.getToken() && !this.isTokenExpired();
  }

  login(credentials: LoginCredentials): Observable<User> {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/usuario/auth`, {
        usuario: credentials.usuario,
        password: credentials.password,
      })
      .pipe(
        map((response) => {
          const user = mapUsuario(response.usuario);
          this.sessionExpiredHandled = false;
          this.currentUser.set(user);
          this.persistSession(user);
          localStorage.setItem(TOKEN_KEY, response.token);
          localStorage.setItem(TOKEN_EXP_KEY, String(response.exp));
          this.startSessionWatch();
          return user;
        }),
        catchError((error) => throwError(() => new Error(extractApiError(error)))),
      );
  }

  logout(): void {
    this.clearSession();
    this.router.navigate(['/login']);
  }

  handleSessionExpired(): void {
    if (this.sessionExpiredHandled) return;
    this.sessionExpiredHandled = true;
    this.clearSession();
    sessionStorage.setItem(SESSION_EXPIRED_KEY, '1');

    if (this.router.url !== '/login') {
      this.router.navigate(['/login']);
    }
  }

  consumeSessionExpiredMessage(): string | null {
    if (!sessionStorage.getItem(SESSION_EXPIRED_KEY)) return null;
    sessionStorage.removeItem(SESSION_EXPIRED_KEY);
    return 'Tu sesión ha expirado. Inicia sesión nuevamente.';
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  isTokenExpired(): boolean {
    const exp = this.getTokenExpiration();
    if (!exp) return true;
    return Date.now() / 1000 >= exp;
  }

  private getTokenExpiration(): number | null {
    const stored = localStorage.getItem(TOKEN_EXP_KEY);
    if (stored) {
      const exp = Number(stored);
      if (Number.isFinite(exp)) return exp;
    }

    const token = this.getToken();
    if (!token) return null;

    try {
      const payload = token.split('.')[1];
      if (!payload) return null;
      const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as {
        exp?: number;
      };
      return typeof decoded.exp === 'number' ? decoded.exp : null;
    } catch {
      return null;
    }
  }

  private loadSession(): User | null {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      const token = localStorage.getItem(TOKEN_KEY);
      if (!raw || !token) return null;

      if (this.isTokenExpired()) {
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(TOKEN_EXP_KEY);
        return null;
      }

      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  }

  private persistSession(user: User): void {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  }

  private clearSession(): void {
    this.stopSessionWatch();
    this.currentUser.set(null);
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXP_KEY);
  }

  private startSessionWatch(): void {
    this.stopSessionWatch();
    this.expiryTimer = setInterval(() => {
      if (this.getToken() && this.isTokenExpired()) {
        this.handleSessionExpired();
      }
    }, 60_000);
  }

  private stopSessionWatch(): void {
    if (this.expiryTimer) {
      clearInterval(this.expiryTimer);
      this.expiryTimer = null;
    }
  }
}
