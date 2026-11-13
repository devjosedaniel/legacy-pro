import { Routes } from '@angular/router';
import { authGuard, guestGuard, permisoGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
    canActivate: [guestGuard],
  },
  {
    path: 'aprobacion',
    children: [
      {
        path: '**',
        loadComponent: () =>
          import('./features/aprobacion/aprobacion-public.component').then(
            (m) => m.AprobacionPublicComponent,
          ),
      },
    ],
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'inventario', pathMatch: 'full' },
      {
        path: 'inventario',
        loadComponent: () =>
          import('./features/dashboard/home/dashboard-home.component').then(
            (m) => m.DashboardHomeComponent,
          ),
        canActivate: [permisoGuard('inventario')],
      },
      {
        path: 'productos',
        loadComponent: () =>
          import('./features/productos/productos-list/productos-list.component').then(
            (m) => m.ProductosListComponent,
          ),
        canActivate: [permisoGuard('productos')],
      },
      {
        path: 'productos/nuevo',
        loadComponent: () =>
          import('./features/productos/producto-form/producto-form.component').then(
            (m) => m.ProductoFormComponent,
          ),
        canActivate: [permisoGuard('productos')],
      },
      {
        path: 'productos/:id',
        loadComponent: () =>
          import('./features/productos/producto-detail/producto-detail.component').then(
            (m) => m.ProductoDetailComponent,
          ),
        canActivate: [permisoGuard('productos')],
      },
      {
        path: 'productos/:id/editar',
        loadComponent: () =>
          import('./features/productos/producto-form/producto-form.component').then(
            (m) => m.ProductoFormComponent,
          ),
        canActivate: [permisoGuard('productos')],
      },
      {
        path: 'movimientos',
        loadComponent: () =>
          import('./features/movimientos/movimientos-list/movimientos-list.component').then(
            (m) => m.MovimientosListComponent,
          ),
        canActivate: [permisoGuard('movimientos')],
      },
      {
        path: 'movimientos/nuevo',
        loadComponent: () =>
          import('./features/movimientos/movement-form/movement-form.component').then(
            (m) => m.MovementFormComponent,
          ),
        canActivate: [permisoGuard('movimientos')],
      },
      {
        path: 'retazos',
        loadComponent: () =>
          import('./features/retazos/retazos-list/retazos-list.component').then(
            (m) => m.RetazosListComponent,
          ),
        canActivate: [permisoGuard('retazos')],
      },
      {
        path: 'reportes',
        loadComponent: () =>
          import('./features/reportes/reportes-home/reportes-home.component').then(
            (m) => m.ReportesHomeComponent,
          ),
        canActivate: [permisoGuard('reportes-inventario')],
      },
      {
        path: 'reportes/retazos-disponibles',
        loadComponent: () =>
          import('./features/reportes/retazos-disponibles-report/retazos-disponibles-report.component').then(
            (m) => m.RetazosDisponiblesReportComponent,
          ),
        canActivate: [permisoGuard('reportes-inventario')],
      },
      {
        path: 'usuarios',
        loadComponent: () =>
          import('./features/usuarios/usuarios-list/usuarios-list.component').then(
            (m) => m.UsuariosListComponent,
          ),
        canActivate: [permisoGuard('usuarios')],
      },
      {
        path: 'usuarios/nuevo',
        loadComponent: () =>
          import('./features/usuarios/usuario-form/usuario-form.component').then(
            (m) => m.UsuarioFormComponent,
          ),
        canActivate: [permisoGuard('usuarios')],
      },
      {
        path: 'usuarios/:id/editar',
        loadComponent: () =>
          import('./features/usuarios/usuario-form/usuario-form.component').then(
            (m) => m.UsuarioFormComponent,
          ),
        canActivate: [permisoGuard('usuarios')],
      },
      {
        path: 'perfiles',
        loadComponent: () =>
          import('./features/perfiles/perfiles-list/perfiles-list.component').then(
            (m) => m.PerfilesListComponent,
          ),
        canActivate: [permisoGuard('perfiles')],
      },
      {
        path: 'perfiles/nuevo',
        loadComponent: () =>
          import('./features/perfiles/perfil-form/perfil-form.component').then(
            (m) => m.PerfilFormComponent,
          ),
        canActivate: [permisoGuard('perfiles')],
      },
      {
        path: 'perfiles/:id/editar',
        loadComponent: () =>
          import('./features/perfiles/perfil-form/perfil-form.component').then(
            (m) => m.PerfilFormComponent,
          ),
        canActivate: [permisoGuard('perfiles')],
      },
      { path: 'produccion', redirectTo: 'produccion/ordenes', pathMatch: 'full' },
      {
        path: 'produccion/ordenes',
        loadComponent: () =>
          import('./features/produccion/ordenes/ordenes-list.component').then(
            (m) => m.OrdenesListComponent,
          ),
        canActivate: [permisoGuard('produccion-ordenes')],
      },
      {
        path: 'produccion/ordenes/:id',
        loadComponent: () =>
          import('./features/produccion/orden-produccion-detail/orden-produccion-detail.component').then(
            (m) => m.OrdenProduccionDetailComponent,
          ),
        canActivate: [permisoGuard('produccion-ordenes')],
      },
      {
        path: 'produccion/planificacion',
        loadComponent: () =>
          import('./features/produccion/planificacion/planificacion-list.component').then(
            (m) => m.PlanificacionListComponent,
          ),
        canActivate: [permisoGuard('produccion-planificacion')],
      },
      {
        path: 'produccion/planificacion/:id',
        loadComponent: () =>
          import('./features/produccion/orden-produccion-detail/orden-produccion-detail.component').then(
            (m) => m.OrdenProduccionDetailComponent,
          ),
        canActivate: [permisoGuard('produccion-planificacion')],
      },
      {
        path: 'produccion/reportes',
        loadComponent: () =>
          import('./features/produccion/produccion-reportes/produccion-reportes.component').then(
            (m) => m.ProduccionReportesComponent,
          ),
        canActivate: [permisoGuard('produccion-reportes')],
      },
      {
        path: 'produccion/grupos',
        loadComponent: () =>
          import('./features/produccion/grupos/grupos-list/grupos-list.component').then(
            (m) => m.GruposListComponent,
          ),
        canActivate: [permisoGuard('produccion-grupos')],
      },
      {
        path: 'produccion/grupos/:id',
        loadComponent: () =>
          import('./features/produccion/grupos/grupo-detail/grupo-detail.component').then(
            (m) => m.GrupoDetailComponent,
          ),
        canActivate: [permisoGuard('produccion-grupos')],
      },
      {
        path: 'produccion/guias-remision',
        loadComponent: () =>
          import('./features/produccion/guias-remision/guias-remision-list.component').then(
            (m) => m.GuiasRemisionListComponent,
          ),
        canActivate: [permisoGuard('produccion-guias-remision')],
      },
      { path: 'ventas', redirectTo: 'ventas/clientes', pathMatch: 'full' },
      {
        path: 'ventas/clientes',
        loadComponent: () =>
          import('./features/ventas/clientes/clientes-list.component').then((m) => m.ClientesListComponent),
        canActivate: [permisoGuard('clientes')],
      },
      {
        path: 'ventas/clientes/nuevo',
        loadComponent: () =>
          import('./features/ventas/clientes/cliente-form.component').then((m) => m.ClienteFormComponent),
        canActivate: [permisoGuard('clientes')],
      },
      {
        path: 'ventas/clientes/:id',
        loadComponent: () =>
          import('./features/ventas/clientes/cliente-form.component').then((m) => m.ClienteFormComponent),
        canActivate: [permisoGuard('clientes')],
      },
      {
        path: 'ventas/cotizaciones',
        loadComponent: () =>
          import('./features/ventas/cotizaciones/cotizaciones-list.component').then(
            (m) => m.CotizacionesListComponent,
          ),
        canActivate: [permisoGuard('cotizaciones')],
      },
      {
        path: 'ventas/cotizaciones/nueva',
        loadComponent: () =>
          import('./features/ventas/cotizaciones/cotizacion-form.component').then(
            (m) => m.CotizacionFormComponent,
          ),
        canActivate: [permisoGuard('cotizaciones')],
      },
      {
        path: 'ventas/cotizaciones/:id',
        loadComponent: () =>
          import('./features/ventas/cotizaciones/cotizacion-detail.component').then(
            (m) => m.CotizacionDetailComponent,
          ),
        canActivate: [permisoGuard('cotizaciones')],
      },
      {
        path: 'produccion/guias-remision/:id',
        loadComponent: () =>
          import('./features/produccion/guias-remision/guia-remision-detail.component').then(
            (m) => m.GuiaRemisionDetailComponent,
          ),
        canActivate: [permisoGuard('produccion-guias-remision')],
      },
      { path: 'compras', redirectTo: 'compras/proveedores', pathMatch: 'full' },
      {
        path: 'compras/proveedores',
        loadComponent: () =>
          import('./features/compras/proveedores/proveedores-list.component').then(
            (m) => m.ProveedoresListComponent,
          ),
        canActivate: [permisoGuard('compras-proveedores')],
      },
      {
        path: 'compras/proveedores/categorias',
        loadComponent: () =>
          import('./features/compras/categorias/categorias-list.component').then(
            (m) => m.CategoriasListComponent,
          ),
        canActivate: [permisoGuard('compras-proveedores')],
      },
      {
        path: 'compras/proveedores/nuevo',
        loadComponent: () =>
          import('./features/compras/proveedores/proveedor-form.component').then(
            (m) => m.ProveedorFormComponent,
          ),
        canActivate: [permisoGuard('compras-proveedores')],
      },
      {
        path: 'compras/proveedores/:id',
        loadComponent: () =>
          import('./features/compras/proveedores/proveedor-form.component').then(
            (m) => m.ProveedorFormComponent,
          ),
        canActivate: [permisoGuard('compras-proveedores')],
      },
      {
        path: 'compras/tipos',
        loadComponent: () =>
          import('./features/compras/tipos/transferencia-tipos.component').then(
            (m) => m.TransferenciaTiposComponent,
          ),
        canActivate: [permisoGuard('compras-transferencias')],
      },
      {
        path: 'compras/transferencias',
        loadComponent: () =>
          import('./features/compras/transferencias/transferencias-list.component').then(
            (m) => m.TransferenciasListComponent,
          ),
        canActivate: [permisoGuard('compras-transferencias')],
      },
      {
        path: 'compras/transferencias/nueva',
        loadComponent: () =>
          import('./features/compras/transferencias/transferencia-form.component').then(
            (m) => m.TransferenciaFormComponent,
          ),
        canActivate: [permisoGuard('compras-transferencias')],
      },
      {
        path: 'compras/transferencias/:id',
        loadComponent: () =>
          import('./features/compras/transferencias/transferencia-detail.component').then(
            (m) => m.TransferenciaDetailComponent,
          ),
        canActivate: [permisoGuard('compras-transferencias')],
      },
    ],
  },
  { path: '', redirectTo: 'dashboard/inventario', pathMatch: 'full' },
  { path: '**', redirectTo: 'dashboard/inventario' },
];
