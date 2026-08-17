import { finalize, Observable, of, shareReplay, tap } from 'rxjs';

/**
 * Reutiliza la misma petición HTTP mientras está en curso y opcionalmente conserva el resultado.
 */
export class CachedLoader<T> {
  private cached: T | null = null;
  private inFlight: Observable<T> | null = null;

  get value(): T | null {
    return this.cached;
  }

  hasCache(): boolean {
    return this.cached !== null;
  }

  load(factory: () => Observable<T>, force = false, retain = true): Observable<T> {
    if (!force && retain && this.cached !== null) {
      return of(this.cached);
    }

    if (!force && this.inFlight) {
      return this.inFlight;
    }

    this.inFlight = factory().pipe(
      tap((value) => {
        if (retain) {
          this.cached = value;
        }
      }),
      shareReplay(1),
      finalize(() => {
        this.inFlight = null;
      }),
    );

    return this.inFlight;
  }

  invalidate(): void {
    this.cached = null;
    this.inFlight = null;
  }

  set(value: T): void {
    this.cached = value;
  }
}

/**
 * Caché por clave para listas parametrizadas (p. ej. marcas por categoría, stock por producto).
 */
export class CachedLoaderMap<K, T> {
  private readonly cache = new Map<K, T>();
  private readonly inFlight = new Map<K, Observable<T>>();

  get(key: K): T | undefined {
    return this.cache.get(key);
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  load(key: K, factory: () => Observable<T>, force = false, retain = true): Observable<T> {
    if (!force && retain && this.cache.has(key)) {
      return of(this.cache.get(key) as T);
    }

    if (!force) {
      const pending = this.inFlight.get(key);
      if (pending) {
        return pending;
      }
    }

    const request = factory().pipe(
      tap((value) => {
        if (retain) {
          this.cache.set(key, value);
        }
      }),
      shareReplay(1),
      finalize(() => {
        this.inFlight.delete(key);
      }),
    );

    this.inFlight.set(key, request);
    return request;
  }

  invalidate(key?: K): void {
    if (key === undefined) {
      this.cache.clear();
      this.inFlight.clear();
      return;
    }

    this.cache.delete(key);
    this.inFlight.delete(key);
  }
}
