import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CategoriaProveedor } from '../../../core/models/categoria.model';
import { CategoriaService } from '../../../core/services/categoria.service';

@Component({
  selector: 'app-categorias-list',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './categorias-list.component.html',
  styleUrl: './categorias-list.component.scss',
})
export class CategoriasListComponent implements OnInit {
  private readonly categoriaService = inject(CategoriaService);
  private readonly fb = inject(FormBuilder);

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly categorias = signal<CategoriaProveedor[]>([]);
  protected readonly editingId = signal<number | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(80)]],
  });

  ngOnInit(): void {
    this.cargar();
  }

  protected editar(categoria: CategoriaProveedor): void {
    this.editingId.set(categoria.id);
    this.form.patchValue({ nombre: categoria.nombre });
    this.errorMessage.set(null);
  }

  protected cancelarEdicion(): void {
    this.editingId.set(null);
    this.form.reset({ nombre: '' });
  }

  protected guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage.set('El nombre es obligatorio.');
      return;
    }
    const nombre = this.form.controls.nombre.value.trim();
    const editingId = this.editingId();
    this.saving.set(true);
    this.errorMessage.set(null);
    const req$ = editingId
      ? this.categoriaService.update(editingId, nombre)
      : this.categoriaService.create(nombre);
    req$.subscribe({
      next: ({ mensaje }) => {
        this.saving.set(false);
        this.successMessage.set(mensaje);
        this.cancelarEdicion();
        this.cargar();
        setTimeout(() => this.successMessage.set(null), 3000);
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.errorMessage.set(err.message);
      },
    });
  }

  protected setEstado(categoria: CategoriaProveedor, activo: boolean): void {
    this.categoriaService.setEstado(categoria.id, activo).subscribe({
      next: ({ mensaje }) => {
        this.successMessage.set(mensaje);
        this.cargar();
        setTimeout(() => this.successMessage.set(null), 3000);
      },
      error: (err: Error) => this.errorMessage.set(err.message),
    });
  }

  private cargar(): void {
    this.loading.set(true);
    this.categoriaService.listTodas().subscribe({
      next: (categorias) => {
        this.categorias.set(categorias);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.loading.set(false);
        this.errorMessage.set(err.message);
      },
    });
  }
}
