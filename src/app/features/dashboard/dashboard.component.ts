import { Component, inject, OnInit, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { InventarioDataService } from '../../core/services/inventario-data.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  disabled?: boolean;
}

const INVENTARIO_ROUTE_PREFIXES = [
  '/dashboard/inventario',
  '/dashboard/productos',
  '/dashboard/movimientos',
  '/dashboard/retazos',
  '/dashboard/reportes',
] as const;

interface PageHeader {
  module: string;
  title: string;
}

@Component({
  selector: 'app-dashboard',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly dataService = inject(InventarioDataService);
  private readonly router = inject(Router);

  protected readonly user = this.auth.user;
  protected readonly sidebarOpen = signal(false);
  protected readonly isLoadingData = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly inventarioMenuOpen = signal(true);
  protected readonly pageHeader = signal<PageHeader>({
    module: 'Inventario',
    title: 'Resumen',
  });

  protected readonly inventarioNavItems: NavItem[] = [
    { label: 'Resumen', icon: 'home', route: '/dashboard/inventario' },
    { label: 'Productos', icon: 'box', route: '/dashboard/productos' },
    { label: 'Movimientos', icon: 'arrows', route: '/dashboard/movimientos' },
    { label: 'Retazos', icon: 'grid', route: '/dashboard/retazos' },
    { label: 'Reportes', icon: 'chart', route: '/dashboard/reportes' },
  ];

  /** Barra inferior móvil: accesos de inventario */
  protected readonly bottomNavItems: NavItem[] = this.inventarioNavItems.slice(0, 4);

  ngOnInit(): void {
    this.syncInventarioMenu(this.router.url);
    this.syncPageHeader(this.router.url);

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event) => {
        const nav = event as NavigationEnd;
        this.syncInventarioMenu(nav.urlAfterRedirects);
        this.syncPageHeader(nav.urlAfterRedirects);
      });

    this.dataService.loadAll().subscribe({
      next: () => {
        this.isLoadingData.set(false);
        this.loadError.set(null);
      },
      error: (err: Error) => {
        this.isLoadingData.set(false);
        this.loadError.set(err.message ?? 'No se pudo cargar el inventario.');
      },
    });
  }

  protected toggleSidebar(): void {
    this.sidebarOpen.update((v) => !v);
  }

  protected closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  protected toggleInventarioMenu(): void {
    this.inventarioMenuOpen.update((open) => !open);
  }

  protected isInventarioSectionActive(): boolean {
    return this.isInventarioRoute(this.router.url);
  }

  protected logout(): void {
    this.auth.logout();
  }

  protected retryLoad(): void {
    this.isLoadingData.set(true);
    this.loadError.set(null);
    this.dataService.loadAll().subscribe({
      next: () => this.isLoadingData.set(false),
      error: (err: Error) => {
        this.isLoadingData.set(false);
        this.loadError.set(err.message ?? 'No se pudo cargar el inventario.');
      },
    });
  }

  private syncInventarioMenu(url: string): void {
    if (this.isInventarioRoute(url)) {
      this.inventarioMenuOpen.set(true);
    }
  }

  private isInventarioRoute(url: string): boolean {
    return INVENTARIO_ROUTE_PREFIXES.some((prefix) => url.startsWith(prefix));
  }

  private syncPageHeader(url: string): void {
    const path = url.split('?')[0];

    if (path.startsWith('/dashboard/inventario')) {
      this.pageHeader.set({ module: 'Inventario', title: 'Resumen' });
      return;
    }
    if (path.startsWith('/dashboard/productos')) {
      this.pageHeader.set({ module: 'Inventario', title: 'Productos' });
      return;
    }
    if (path.startsWith('/dashboard/movimientos')) {
      this.pageHeader.set({ module: 'Inventario', title: 'Movimientos' });
      return;
    }
    if (path.startsWith('/dashboard/retazos')) {
      this.pageHeader.set({ module: 'Inventario', title: 'Retazos' });
      return;
    }
    if (path.startsWith('/dashboard/reportes')) {
      this.pageHeader.set({ module: 'Inventario', title: 'Reportes' });
      return;
    }

    this.pageHeader.set({ module: 'Legacy Pro', title: 'Inicio' });
  }
}
