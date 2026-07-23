import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
    canActivate: [guestGuard],
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/dashboard/home/dashboard-home.component').then(
            (m) => m.DashboardHomeComponent,
          ),
      },
      {
        path: 'productos',
        loadComponent: () =>
          import('./features/productos/productos-list/productos-list.component').then(
            (m) => m.ProductosListComponent,
          ),
      },
      {
        path: 'productos/nuevo',
        loadComponent: () =>
          import('./features/productos/producto-form/producto-form.component').then(
            (m) => m.ProductoFormComponent,
          ),
      },
      {
        path: 'productos/:id',
        loadComponent: () =>
          import('./features/productos/producto-detail/producto-detail.component').then(
            (m) => m.ProductoDetailComponent,
          ),
      },
      {
        path: 'productos/:id/editar',
        loadComponent: () =>
          import('./features/productos/producto-form/producto-form.component').then(
            (m) => m.ProductoFormComponent,
          ),
      },
      {
        path: 'movimientos',
        loadComponent: () =>
          import('./features/movimientos/movimientos-list/movimientos-list.component').then(
            (m) => m.MovimientosListComponent,
          ),
      },
      {
        path: 'movimientos/nuevo',
        loadComponent: () =>
          import('./features/movimientos/movement-form/movement-form.component').then(
            (m) => m.MovementFormComponent,
          ),
      },
      {
        path: 'retazos',
        loadComponent: () =>
          import('./features/retazos/retazos-list/retazos-list.component').then(
            (m) => m.RetazosListComponent,
          ),
      },
      {
        path: 'reportes',
        loadComponent: () =>
          import('./features/reportes/reportes-home/reportes-home.component').then(
            (m) => m.ReportesHomeComponent,
          ),
      },
    ],
  },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: 'dashboard' },
];
