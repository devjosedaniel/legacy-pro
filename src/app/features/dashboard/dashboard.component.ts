import { Component, inject, OnInit, signal } from '@angular/core';

import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';

import { InventarioDataService } from '../../core/services/inventario-data.service';



interface NavItem {

  label: string;

  icon: string;

  route: string;

  disabled?: boolean;

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



  protected readonly user = this.auth.user;

  protected readonly sidebarOpen = signal(false);

  protected readonly isLoadingData = signal(true);

  protected readonly loadError = signal<string | null>(null);



  protected readonly navItems: NavItem[] = [

    { label: 'Inicio', icon: 'home', route: '/dashboard' },

    { label: 'Productos', icon: 'box', route: '/dashboard/productos' },

    { label: 'Movimientos', icon: 'arrows', route: '/dashboard/movimientos' },

    { label: 'Retazos', icon: 'grid', route: '/dashboard/retazos' },

    { label: 'Reportes', icon: 'chart', route: '/dashboard/reportes', disabled: true },

  ];



  ngOnInit(): void {

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

}


