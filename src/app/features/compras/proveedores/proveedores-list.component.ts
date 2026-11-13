import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Proveedor, tipoPersonaNombre } from '../../../core/models/proveedor.model';
import { ProveedorService } from '../../../core/services/proveedor.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-proveedores-list',
  imports: [RouterLink, ConfirmDialogComponent],
  templateUrl: './proveedores-list.component.html',
  styleUrl: './proveedores-list.component.scss',
})
export class ProveedoresListComponent implements OnInit {
  private readonly proveedorService = inject(ProveedorService);

  protected readonly tipoPersonaNombre = tipoPersonaNombre;
  protected readonly search = signal('');
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly proveedores = signal<Proveedor[]>([]);
  protected readonly confirmOpen = signal(false);
  protected readonly confirmLoading = signal(false);
  protected readonly pendingDelete = signal<Proveedor | null>(null);

  protected readonly filtered = computed(() => {
    const query = this.search().toLowerCase().trim();
    if (!query) return this.proveedores();
    return this.proveedores().filter((proveedor) => {
      const haystack = [
        proveedor.nombre,
        proveedor.identificador,
        proveedor.contacto,
        proveedor.telefonos,
        proveedor.email,
        proveedor.direccion,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  });

  ngOnInit(): void {
    const message = (history.state as { successMessage?: string } | null)?.successMessage;
    if (message) {
      this.successMessage.set(message);
      history.replaceState({ ...history.state, successMessage: undefined }, '');
      setTimeout(() => this.successMessage.set(null), 4000);
    }
    this.load();
  }

  protected onSearch(value: string): void {
    this.search.set(value);
  }

  protected confirmDelete(proveedor: Proveedor): void {
    this.pendingDelete.set(proveedor);
    this.confirmOpen.set(true);
  }

  protected onConfirmDelete(): void {
    const proveedor = this.pendingDelete();
    if (!proveedor) return;
    this.confirmLoading.set(true);
    this.proveedorService.delete(proveedor.id).subscribe({
      next: (mensaje) => {
        this.proveedores.update((list) => list.filter((item) => item.id !== proveedor.id));
        this.confirmLoading.set(false);
        this.confirmOpen.set(false);
        this.pendingDelete.set(null);
        this.successMessage.set(mensaje);
        setTimeout(() => this.successMessage.set(null), 4000);
      },
      error: (err: Error) => {
        this.confirmLoading.set(false);
        this.confirmOpen.set(false);
        this.errorMessage.set(err.message);
      },
    });
  }

  protected onCancelDelete(): void {
    this.confirmOpen.set(false);
    this.pendingDelete.set(null);
  }

  private load(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.proveedorService.load().subscribe({
      next: (list) => {
        this.proveedores.set(list.filter((item) => item.activo));
        this.isLoading.set(false);
      },
      error: (err: Error) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.message);
      },
    });
  }
}
