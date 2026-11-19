import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { InventarioDataService } from '../../core/services/inventario-data.service';
import { PermisoService } from '../../core/services/permiso.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  exact?: boolean;
  permiso?: string;
}

interface NavGroup {
  id: string;
  label: string;
  icon: string;
  comingSoon?: boolean;
  items?: NavItem[];
}

const INVENTARIO_ROUTE_PREFIXES = [
  '/dashboard/inventario',
  '/dashboard/productos',
  '/dashboard/movimientos',
  '/dashboard/retazos',
  '/dashboard/reportes',
] as const;

const SISTEMA_ROUTE_PREFIXES = ['/dashboard/usuarios', '/dashboard/perfiles'] as const;
const PRODUCCION_ROUTE_PREFIXES = ['/dashboard/produccion'] as const;
const VENTAS_ROUTE_PREFIXES = ['/dashboard/ventas'] as const;
const COMPRAS_ROUTE_PREFIXES = ['/dashboard/compras'] as const;
const CONTABILIDAD_ROUTE_PREFIXES = ['/dashboard/contabilidad'] as const;

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
  private readonly permisos = inject(PermisoService);
  private readonly router = inject(Router);

  protected readonly user = this.auth.user;
  protected readonly sidebarOpen = signal(false);
  protected readonly isLoadingData = signal(false);
  protected readonly loadError = signal<string | null>(null);
  protected readonly openGroupId = signal<string | null>('inventario');
  protected readonly pageHeader = signal<PageHeader>({
    module: 'Inventario',
    title: 'Resumen',
  });

  private readonly allNavGroups: NavGroup[] = [
    {
      id: 'inventario',
      label: 'Inventario',
      icon: 'inventory',
      items: [
        { label: 'Resumen', icon: 'home', route: '/dashboard/inventario', exact: true, permiso: 'inventario' },
        { label: 'Productos', icon: 'box', route: '/dashboard/productos', permiso: 'productos' },
        { label: 'Movimientos', icon: 'arrows', route: '/dashboard/movimientos', permiso: 'movimientos' },
        { label: 'Retazos', icon: 'grid', route: '/dashboard/retazos', permiso: 'retazos' },
        { label: 'Reportes', icon: 'chart', route: '/dashboard/reportes', permiso: 'reportes-inventario' },
      ],
    },
    {
      id: 'ventas',
      label: 'Ventas',
      icon: 'sales',
      items: [
        { label: 'Clientes', icon: 'users', route: '/dashboard/ventas/clientes', permiso: 'clientes' },
        { label: 'Cotizaciones', icon: 'chart', route: '/dashboard/ventas/cotizaciones', permiso: 'cotizaciones' },
      ],
    },
    { id: 'trabajos', label: 'Trabajos', icon: 'work', comingSoon: true },
    {
      id: 'produccion',
      label: 'Producción',
      icon: 'production',
      items: [
        {
          label: 'Órdenes',
          icon: 'work',
          route: '/dashboard/produccion/ordenes',
          permiso: 'produccion-ordenes',
        },
        {
          label: 'Grupos',
          icon: 'box',
          route: '/dashboard/produccion/grupos',
          permiso: 'produccion-grupos',
        },
        {
          label: 'Planificación',
          icon: 'work',
          route: '/dashboard/produccion/planificacion',
          permiso: 'produccion-planificacion',
        },
        {
          label: 'Reportes',
          icon: 'chart',
          route: '/dashboard/produccion/reportes',
          permiso: 'produccion-reportes',
        },
        {
          label: 'Guías de remisión',
          icon: 'grid',
          route: '/dashboard/produccion/guias-remision',
          permiso: 'produccion-guias-remision',
        },
      ],
    },
    {
      id: 'compras',
      label: 'Compras',
      icon: 'purchase',
      items: [
        {
          label: 'Órdenes de compra',
          icon: 'purchase',
          route: '/dashboard/compras/ordenes',
          permiso: 'compras-ordenes',
        },
        {
          label: 'Proveedores',
          icon: 'users',
          route: '/dashboard/compras/proveedores',
          permiso: 'compras-proveedores',
        },
        {
          label: 'Transferencias',
          icon: 'arrows',
          route: '/dashboard/compras/transferencias',
          permiso: 'compras-transferencias',
        },
        {
          label: 'Importaciones',
          icon: 'purchase',
          route: '/dashboard/compras/importaciones',
          permiso: 'compras-importaciones',
        },
      ],
    },
    {
      id: 'contabilidad',
      label: 'Contabilidad',
      icon: 'accounting',
      items: [
        {
          label: 'Comprobantes recibidos',
          icon: 'chart',
          route: '/dashboard/contabilidad/recibidos',
          permiso: 'sri-recibidos',
        },
      ],
    },
    { id: 'configuracion', label: 'Configuración', icon: 'settings', comingSoon: true },
    {
      id: 'sistema',
      label: 'Sistema',
      icon: 'system',
      items: [
        { label: 'Usuarios', icon: 'users', route: '/dashboard/usuarios', permiso: 'usuarios' },
        { label: 'Perfiles', icon: 'system', route: '/dashboard/perfiles', permiso: 'perfiles' },
      ],
    },
  ];

  protected readonly navGroups = computed(() =>
    this.allNavGroups
      .map((group) => {
        if (group.comingSoon) return group;
        const items = (group.items ?? []).filter(
          (item) => !item.permiso || this.permisos.can(item.permiso),
        );
        return { ...group, items };
      })
      .filter((group) => group.comingSoon || (group.items && group.items.length > 0)),
  );

  protected readonly bottomNavItems = computed(() => {
    const items: (NavItem & { disabled?: boolean })[] = [];

    if (this.permisos.canModule('inventario')) {
      items.push({ label: 'Inventario', icon: 'inventory', route: '/dashboard/inventario', exact: true });
    }

    if (this.permisos.can('clientes')) {
      items.push({ label: 'Ventas', icon: 'sales', route: '/dashboard/ventas/clientes' });
    } else if (this.permisos.can('cotizaciones')) {
      items.push({ label: 'Ventas', icon: 'sales', route: '/dashboard/ventas/cotizaciones' });
    } else {
      items.push({ label: 'Ventas', icon: 'sales', route: '/dashboard/ventas', disabled: true });
    }

    if (this.permisos.can('produccion-ordenes')) {
      items.push({ label: 'Producción', icon: 'production', route: '/dashboard/produccion/ordenes' });
    } else if (this.permisos.can('produccion-grupos')) {
      items.push({ label: 'Producción', icon: 'production', route: '/dashboard/produccion/grupos' });
    } else if (this.permisos.can('produccion-planificacion')) {
      items.push({ label: 'Producción', icon: 'production', route: '/dashboard/produccion/planificacion' });
    } else if (this.permisos.can('produccion-reportes')) {
      items.push({ label: 'Producción', icon: 'production', route: '/dashboard/produccion/reportes' });
    } else if (this.permisos.can('produccion-guias-remision')) {
      items.push({ label: 'Producción', icon: 'production', route: '/dashboard/produccion/guias-remision' });
    } else {
      items.push({ label: 'Producción', icon: 'production', route: '/dashboard/produccion', disabled: true });
    }

    if (this.permisos.canModule('sistema')) {
      const sistemaRoute = this.permisos.can('usuarios')
        ? '/dashboard/usuarios'
        : '/dashboard/perfiles';
      items.push({ label: 'Sistema', icon: 'system', route: sistemaRoute });
    }

    return items;
  });

  ngOnInit(): void {
    this.applyRoute(this.router.url);

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.applyRoute((event as NavigationEnd).urlAfterRedirects);
      });
  }

  protected toggleSidebar(): void {
    this.sidebarOpen.update((v) => !v);
  }

  protected closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  protected toggleGroup(groupId: string): void {
    this.openGroupId.update((current) => (current === groupId ? null : groupId));
  }

  protected isGroupActive(group: NavGroup): boolean {
    return this.groupIdForUrl(this.router.url) === group.id;
  }

  protected isBottomItemActive(item: NavItem): boolean {
    const url = this.router.url;
    if (item.route === '/dashboard/inventario') {
      return this.isInventarioRoute(url);
    }
    if (item.route === '/dashboard/usuarios') {
      return this.isSistemaRoute(url);
    }
    if (this.isProduccionRoute(item.route)) {
      return this.isProduccionRoute(url);
    }
    if (this.isVentasRoute(item.route)) {
      return this.isVentasRoute(url);
    }
    if (this.isComprasRoute(item.route)) {
      return this.isComprasRoute(url);
    }
    return url.startsWith(item.route);
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

  private applyRoute(url: string): void {
    const groupId = this.groupIdForUrl(url);
    if (groupId) {
      this.openGroupId.set(groupId);
    }
    this.syncPageHeader(url);
    this.syncDataLoad(url);
  }

  private groupIdForUrl(url: string): string | null {
    if (this.isInventarioRoute(url)) return 'inventario';
    if (this.isVentasRoute(url)) return 'ventas';
    if (this.isComprasRoute(url)) return 'compras';
    if (this.isContabilidadRoute(url)) return 'contabilidad';
    if (this.isProduccionRoute(url)) return 'produccion';
    if (this.isSistemaRoute(url)) return 'sistema';
    return null;
  }

  private isInventarioRoute(url: string): boolean {
    return INVENTARIO_ROUTE_PREFIXES.some((prefix) => url.startsWith(prefix));
  }

  private isSistemaRoute(url: string): boolean {
    return SISTEMA_ROUTE_PREFIXES.some((prefix) => url.startsWith(prefix));
  }

  private isProduccionRoute(url: string): boolean {
    return PRODUCCION_ROUTE_PREFIXES.some((prefix) => url.startsWith(prefix));
  }

  private isVentasRoute(url: string): boolean {
    return VENTAS_ROUTE_PREFIXES.some((prefix) => url.startsWith(prefix));
  }

  private isComprasRoute(url: string): boolean {
    return COMPRAS_ROUTE_PREFIXES.some((prefix) => url.startsWith(prefix));
  }

  private isContabilidadRoute(url: string): boolean {
    return CONTABILIDAD_ROUTE_PREFIXES.some((prefix) => url.startsWith(prefix));
  }

  private syncDataLoad(url: string): void {
    if (!this.isInventarioRoute(url)) {
      this.isLoadingData.set(false);
      this.loadError.set(null);
      return;
    }

    if (this.dataService.isReady) {
      this.isLoadingData.set(false);
      this.loadError.set(null);
      return;
    }

    this.isLoadingData.set(true);
    this.dataService.ensureLoaded().subscribe({
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
    if (path.startsWith('/dashboard/reportes/retazos-disponibles')) {
      this.pageHeader.set({ module: 'Inventario', title: 'Retazos disponibles' });
      return;
    }
    if (path.startsWith('/dashboard/reportes')) {
      this.pageHeader.set({ module: 'Inventario', title: 'Reportes' });
      return;
    }
    if (path.startsWith('/dashboard/usuarios/nuevo')) {
      this.pageHeader.set({ module: 'Sistema', title: 'Nuevo usuario' });
      return;
    }
    if (path.includes('/editar') && path.startsWith('/dashboard/usuarios/')) {
      this.pageHeader.set({ module: 'Sistema', title: 'Editar usuario' });
      return;
    }
    if (path.startsWith('/dashboard/usuarios')) {
      this.pageHeader.set({ module: 'Sistema', title: 'Usuarios' });
      return;
    }
    if (path.startsWith('/dashboard/perfiles/nuevo')) {
      this.pageHeader.set({ module: 'Sistema', title: 'Nuevo perfil' });
      return;
    }
    if (path.includes('/editar') && path.startsWith('/dashboard/perfiles/')) {
      this.pageHeader.set({ module: 'Sistema', title: 'Editar perfil' });
      return;
    }
    if (path.startsWith('/dashboard/perfiles')) {
      this.pageHeader.set({ module: 'Sistema', title: 'Perfiles y permisos' });
      return;
    }
    if (path.startsWith('/dashboard/produccion/ordenes/') && path !== '/dashboard/produccion/ordenes') {
      this.pageHeader.set({ module: 'Producción', title: 'Detalle de orden' });
      return;
    }
    if (path.startsWith('/dashboard/produccion/ordenes')) {
      this.pageHeader.set({ module: 'Producción', title: 'Órdenes' });
      return;
    }
    if (path.startsWith('/dashboard/produccion/grupos/') && path !== '/dashboard/produccion/grupos') {
      this.pageHeader.set({ module: 'Producción', title: 'Detalle de grupo' });
      return;
    }
    if (path.startsWith('/dashboard/produccion/grupos')) {
      this.pageHeader.set({ module: 'Producción', title: 'Grupos' });
      return;
    }
    if (path.startsWith('/dashboard/produccion/planificacion/') && path !== '/dashboard/produccion/planificacion') {
      this.pageHeader.set({ module: 'Producción', title: 'Detalle de orden' });
      return;
    }
    if (path.startsWith('/dashboard/produccion/planificacion')) {
      this.pageHeader.set({ module: 'Producción', title: 'Planificación' });
      return;
    }
    if (path.startsWith('/dashboard/produccion/reportes')) {
      this.pageHeader.set({ module: 'Producción', title: 'Reportes' });
      return;
    }
    if (path.startsWith('/dashboard/produccion/guias-remision/') && path !== '/dashboard/produccion/guias-remision') {
      this.pageHeader.set({ module: 'Producción', title: 'Detalle de guía' });
      return;
    }
    if (path.startsWith('/dashboard/produccion/guias-remision')) {
      this.pageHeader.set({ module: 'Producción', title: 'Guías de remisión' });
      return;
    }
    if (path.startsWith('/dashboard/produccion')) {
      this.pageHeader.set({ module: 'Producción', title: 'Inicio' });
      return;
    }
    if (path.startsWith('/dashboard/ventas/clientes/nuevo')) {
      this.pageHeader.set({ module: 'Ventas', title: 'Nuevo cliente' });
      return;
    }
    if (path.startsWith('/dashboard/ventas/clientes/') && path !== '/dashboard/ventas/clientes') {
      this.pageHeader.set({ module: 'Ventas', title: 'Cliente' });
      return;
    }
    if (path.startsWith('/dashboard/ventas/clientes')) {
      this.pageHeader.set({ module: 'Ventas', title: 'Clientes' });
      return;
    }
    if (path.startsWith('/dashboard/ventas/cotizaciones/nueva')) {
      this.pageHeader.set({ module: 'Ventas', title: 'Nueva cotización' });
      return;
    }
    if (path.startsWith('/dashboard/ventas/cotizaciones/') && path !== '/dashboard/ventas/cotizaciones') {
      this.pageHeader.set({ module: 'Ventas', title: 'Cotización' });
      return;
    }
    if (path.startsWith('/dashboard/ventas/cotizaciones')) {
      this.pageHeader.set({ module: 'Ventas', title: 'Cotizaciones' });
      return;
    }
    if (path.startsWith('/dashboard/compras/ordenes/nueva')) {
      this.pageHeader.set({ module: 'Compras', title: 'Nueva orden de compra' });
      return;
    }
    if (path.includes('/compras/ordenes/') && path.endsWith('/editar')) {
      this.pageHeader.set({ module: 'Compras', title: 'Editar orden de compra' });
      return;
    }
    if (path.startsWith('/dashboard/compras/ordenes/') && path !== '/dashboard/compras/ordenes') {
      this.pageHeader.set({ module: 'Compras', title: 'Orden de compra' });
      return;
    }
    if (path.startsWith('/dashboard/compras/ordenes')) {
      this.pageHeader.set({ module: 'Compras', title: 'Órdenes de compra' });
      return;
    }
    if (path.startsWith('/dashboard/compras/proveedores/categorias')) {
      this.pageHeader.set({ module: 'Compras', title: 'Categorías' });
      return;
    }
    if (path.startsWith('/dashboard/compras/proveedores/nuevo')) {
      this.pageHeader.set({ module: 'Compras', title: 'Nuevo proveedor' });
      return;
    }
    if (path.startsWith('/dashboard/compras/proveedores/') && path !== '/dashboard/compras/proveedores') {
      this.pageHeader.set({ module: 'Compras', title: 'Proveedor' });
      return;
    }
    if (path.startsWith('/dashboard/compras/proveedores')) {
      this.pageHeader.set({ module: 'Compras', title: 'Proveedores' });
      return;
    }
    if (path.startsWith('/dashboard/compras/tipos')) {
      this.pageHeader.set({ module: 'Compras', title: 'Tipos de transferencia' });
      return;
    }
    if (path.startsWith('/dashboard/compras/importaciones/nueva')) {
      this.pageHeader.set({ module: 'Compras', title: 'Nueva importación' });
      return;
    }
    if (path.startsWith('/dashboard/compras/importaciones/') && path !== '/dashboard/compras/importaciones') {
      this.pageHeader.set({ module: 'Compras', title: 'Importación' });
      return;
    }
    if (path.startsWith('/dashboard/compras/importaciones')) {
      this.pageHeader.set({ module: 'Compras', title: 'Importaciones' });
      return;
    }
    if (path.startsWith('/dashboard/compras/transferencias/nueva')) {
      this.pageHeader.set({ module: 'Compras', title: 'Nueva transferencia' });
      return;
    }
    if (path.startsWith('/dashboard/compras/transferencias/') && path !== '/dashboard/compras/transferencias') {
      this.pageHeader.set({ module: 'Compras', title: 'Transferencia' });
      return;
    }
    if (path.startsWith('/dashboard/compras/transferencias') || path.startsWith('/dashboard/compras')) {
      this.pageHeader.set({ module: 'Compras', title: 'Transferencias' });
      return;
    }
    if (path.startsWith('/dashboard/contabilidad/recibidos/importar')) {
      this.pageHeader.set({ module: 'Contabilidad', title: 'Importar comprobantes' });
      return;
    }
    if (path.match(/^\/dashboard\/contabilidad\/recibidos\/\d+/)) {
      this.pageHeader.set({ module: 'Contabilidad', title: 'Comprobante recibido' });
      return;
    }
    if (path.startsWith('/dashboard/contabilidad')) {
      this.pageHeader.set({ module: 'Contabilidad', title: 'Comprobantes recibidos' });
      return;
    }

    this.pageHeader.set({ module: 'Legacy Pro', title: 'Inicio' });
  }
}
