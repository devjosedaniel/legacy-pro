import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SistemaUsuario } from '../../../core/models/usuario.model';
import { UsuarioService } from '../../../core/services/usuario.service';
import { rolLabel } from '../../../core/utils/api.mappers';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-usuarios-list',
  imports: [RouterLink, ConfirmDialogComponent],
  templateUrl: './usuarios-list.component.html',
  styleUrl: './usuarios-list.component.scss',
})
export class UsuariosListComponent implements OnInit {
  private readonly usuarioService = inject(UsuarioService);

  protected readonly search = signal('');
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly deletingId = signal<string | null>(null);
  protected readonly confirmOpen = signal(false);
  protected readonly confirmLoading = signal(false);
  protected readonly pendingDelete = signal<SistemaUsuario | null>(null);

  protected readonly usuarios = this.usuarioService.all;

  protected readonly filtered = computed(() => {
    const query = this.search().toLowerCase().trim();
    const list = this.usuarios();
    if (!query) return list;

    return list.filter((usuario) => {
      const haystack = [
        usuario.usuario,
        usuario.nombre,
        usuario.email,
        usuario.perfilNombre,
        rolLabel(usuario.rol),
        usuario.rol,
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

    this.loadUsuarios();
  }

  protected onSearch(value: string): void {
    this.search.set(value);
  }

  protected rolLabel(rol: string): string {
    return rolLabel(rol);
  }

  protected formatDate(value?: string): string {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString('es-EC', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  }

  protected confirmDelete(usuario: SistemaUsuario): void {
    this.pendingDelete.set(usuario);
    this.confirmOpen.set(true);
  }

  protected onConfirmDelete(): void {
    const usuario = this.pendingDelete();
    if (!usuario) return;

    this.confirmLoading.set(true);
    this.deletingId.set(usuario.id);
    this.usuarioService.delete(usuario.id).subscribe({
      next: () => {
        this.confirmLoading.set(false);
        this.confirmOpen.set(false);
        this.pendingDelete.set(null);
        this.deletingId.set(null);
        this.successMessage.set(`Usuario ${usuario.usuario} eliminado.`);
        setTimeout(() => this.successMessage.set(null), 4000);
      },
      error: (err: Error) => {
        this.confirmLoading.set(false);
        this.confirmOpen.set(false);
        this.deletingId.set(null);
        this.errorMessage.set(err.message);
      },
    });
  }

  protected onCancelDelete(): void {
    if (this.confirmLoading()) return;
    this.confirmOpen.set(false);
    this.pendingDelete.set(null);
  }

  private loadUsuarios(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.usuarioService.load().subscribe({
      next: () => this.isLoading.set(false),
      error: (err: Error) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.message);
      },
    });
  }
}
