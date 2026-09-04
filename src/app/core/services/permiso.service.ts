import { Injectable, computed, inject } from '@angular/core';
import { PERMISO_MODULOS, PermisoModulo, PermisoPagina } from '../models/permiso.model';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class PermisoService {
  private readonly auth = inject(AuthService);

  readonly catalogo = PERMISO_MODULOS;

  private readonly directorios = computed(() => this.auth.user()?.directorios ?? []);
  private readonly isAdmin = computed(() => this.auth.user()?.role === 'admin');

  can(slug: string): boolean {
    const pagina = this.findPagina(slug);
    if (!pagina) return false;
    return this.canPagina(pagina);
  }

  canModule(moduleId: string): boolean {
    const modulo = this.catalogo.find((item) => item.id === moduleId);
    if (!modulo) return false;
    if (modulo.paginas.length === 0) return this.isAdmin();
    return modulo.paginas.some((pagina) => this.canPagina(pagina));
  }

  canRoute(route: string): boolean {
    const path = route.split('?')[0];
    const matches = this.allPaginas()
      .filter((pagina) => pagina.route && path.startsWith(pagina.route))
      .sort((a, b) => (b.route?.length ?? 0) - (a.route?.length ?? 0));

    const pagina = matches[0];
    return pagina ? this.canPagina(pagina) : this.isAdmin();
  }

  firstAllowedRoute(): string {
    const granted = this.allPaginas().find(
      (pagina) => pagina.available && pagina.route && this.canPagina(pagina),
    );
    return granted?.route ?? '/dashboard/inventario';
  }

  paginasDe(ids: number[]): PermisoPagina[] {
    const set = new Set(ids);
    return this.allPaginas().filter((pagina) => set.has(pagina.id));
  }

  private canPagina(pagina: PermisoPagina): boolean {
    if (this.isAdmin() && pagina.available) {
      return true;
    }

    const modulo = this.moduloDe(pagina.id);
    if (modulo?.defaultGrant && !this.hasAnyFromModule(modulo)) {
      return pagina.available;
    }

    return this.directorios().includes(pagina.id);
  }

  private hasAnyFromModule(modulo: PermisoModulo): boolean {
    return modulo.paginas.some((pagina) => this.directorios().includes(pagina.id));
  }

  private findPagina(slug: string): PermisoPagina | undefined {
    return this.allPaginas().find((pagina) => pagina.slug === slug);
  }

  private moduloDe(pageId: number): PermisoModulo | undefined {
    return this.catalogo.find((modulo) => modulo.paginas.some((pagina) => pagina.id === pageId));
  }

  private allPaginas(): PermisoPagina[] {
    return this.catalogo.flatMap((modulo) => modulo.paginas);
  }
}
