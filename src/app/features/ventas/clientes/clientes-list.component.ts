import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Cliente } from '../../../core/models/cliente.model';
import { EMPRESAS_CLIENTE, empresaNombre } from '../../../core/models/geo.const';
import { ClienteService } from '../../../core/services/cliente.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-clientes-list',
  imports: [RouterLink, ConfirmDialogComponent],
  templateUrl: './clientes-list.component.html',
  styleUrl: './clientes-list.component.scss',
})
export class ClientesListComponent implements OnInit {
  private readonly clienteService = inject(ClienteService);

  protected readonly empresas = EMPRESAS_CLIENTE;
  protected readonly empresaNombre = empresaNombre;
  protected readonly search = signal('');
  protected readonly empresaFilter = signal<number | 'all'>('all');
  protected readonly isLoading = signal(true);
  protected readonly uploading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly clientes = signal<Cliente[]>([]);
  protected readonly confirmOpen = signal(false);
  protected readonly confirmLoading = signal(false);
  protected readonly pendingDelete = signal<Cliente | null>(null);

  protected readonly filtered = computed(() => {
    const query = this.search().toLowerCase().trim();
    const empresa = this.empresaFilter();
    return this.clientes().filter((cliente) => {
      if (empresa !== 'all' && cliente.empresaId !== empresa) return false;
      if (!query) return true;
      const haystack = [
        cliente.nombres,
        cliente.identificador,
        cliente.ciudad,
        cliente.pais,
        cliente.telefono,
        cliente.contacto,
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
      setTimeout(() => this.successMessage.set(null), 5000);
    }
    this.load();
  }

  protected onSearch(value: string): void {
    this.search.set(value);
  }

  protected onEmpresa(value: string): void {
    this.empresaFilter.set(value === 'all' ? 'all' : Number(value));
  }

  protected confirmDelete(cliente: Cliente): void {
    this.pendingDelete.set(cliente);
    this.confirmOpen.set(true);
  }

  protected onConfirmDelete(): void {
    const cliente = this.pendingDelete();
    if (!cliente) return;
    this.confirmLoading.set(true);
    this.clienteService.delete(cliente.id).subscribe({
      next: () => {
        this.clientes.update((list) => list.filter((item) => item.id !== cliente.id));
        this.confirmLoading.set(false);
        this.confirmOpen.set(false);
        this.pendingDelete.set(null);
        this.successMessage.set(`Cliente ${cliente.nombres} eliminado.`);
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
    if (this.confirmLoading()) return;
    this.confirmOpen.set(false);
    this.pendingDelete.set(null);
  }

  protected onExcelSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    const okType =
      file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls');
    if (!okType) {
      this.errorMessage.set('Solo puedes subir archivos Excel (.xls, .xlsx).');
      return;
    }
    if (file.size / 1024 / 1024 >= 2) {
      this.errorMessage.set('El archivo debe ser menor a 2 MB.');
      return;
    }

    this.uploading.set(true);
    this.errorMessage.set(null);
    this.clienteService.uploadExcel(file).subscribe({
      next: (mensaje) => {
        this.uploading.set(false);
        this.successMessage.set(mensaje);
        this.load();
      },
      error: (err: Error) => {
        this.uploading.set(false);
        this.errorMessage.set(err.message);
      },
    });
  }

  protected copyLink(url: string | null | undefined): void {
    if (!url) return;
    navigator.clipboard.writeText(url).then(
      () => {
        this.successMessage.set('Enlace copiado.');
        setTimeout(() => this.successMessage.set(null), 2500);
      },
      () => this.errorMessage.set('No se pudo copiar el enlace.'),
    );
  }

  private load(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.clienteService.listAll().subscribe({
      next: (clientes) => {
        this.clientes.set(clientes);
        this.isLoading.set(false);
      },
      error: (err: Error) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.message);
      },
    });
  }
}
