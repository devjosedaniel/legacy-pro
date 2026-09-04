import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Perfil } from '../../../core/models/perfil.model';
import { PerfilService } from '../../../core/services/perfil.service';
import { PermisoService } from '../../../core/services/permiso.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-perfiles-list',
  imports: [RouterLink, ConfirmDialogComponent],
  templateUrl: './perfiles-list.component.html',
  styleUrl: './perfiles-list.component.scss',
})
export class PerfilesListComponent implements OnInit {
  private readonly perfilService = inject(PerfilService);
  private readonly permisoService = inject(PermisoService);

  protected readonly search = signal('');
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly confirmOpen = signal(false);
  protected readonly confirmLoading = signal(false);
  protected readonly pendingDelete = signal<Perfil | null>(null);

  protected readonly perfiles = this.perfilService.all;

  protected readonly filtered = computed(() => {
    const query = this.search().toLowerCase().trim();
    const list = this.perfiles();
    if (!query) return list;
    return list.filter((perfil) => perfil.nombre.toLowerCase().includes(query));
  });

  ngOnInit(): void {
    const message = (history.state as { successMessage?: string } | null)?.successMessage;
    if (message) {
      this.successMessage.set(message);
      history.replaceState({ ...history.state, successMessage: undefined }, '');
      setTimeout(() => this.successMessage.set(null), 5000);
    }

    this.perfilService.refresh().subscribe({
      next: () => this.isLoading.set(false),
      error: (err: Error) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.message);
      },
    });
  }

  protected onSearch(value: string): void {
    this.search.set(value);
  }

  protected paginasLabel(perfil: Perfil): string {
    const paginas = this.permisoService.paginasDe(perfil.directorios);
    if (paginas.length === 0) return 'Sin páginas asignadas';
    return paginas
      .slice(0, 4)
      .map((pagina) => pagina.nombre)
      .concat(paginas.length > 4 ? [`+${paginas.length - 4}`] : [])
      .join(' · ');
  }

  protected confirmDelete(perfil: Perfil): void {
    this.pendingDelete.set(perfil);
    this.confirmOpen.set(true);
  }

  protected onConfirmDelete(): void {
    const perfil = this.pendingDelete();
    if (!perfil) return;

    this.confirmLoading.set(true);
    this.perfilService.delete(perfil.id).subscribe({
      next: () => {
        this.confirmLoading.set(false);
        this.confirmOpen.set(false);
        this.pendingDelete.set(null);
        this.successMessage.set(`Perfil ${perfil.nombre} eliminado.`);
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
}
