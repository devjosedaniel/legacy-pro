import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  ProveedorCategoria,
  TIPOS_PERSONA_PROVEEDOR,
} from '../../../core/models/proveedor.model';
import { CategoriaService } from '../../../core/services/categoria.service';
import { ProveedorService } from '../../../core/services/proveedor.service';

@Component({
  selector: 'app-proveedor-form',
  imports: [ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './proveedor-form.component.html',
  styleUrl: './proveedor-form.component.scss',
})
export class ProveedorFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly proveedorService = inject(ProveedorService);
  private readonly categoriaService = inject(CategoriaService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly tiposPersona = TIPOS_PERSONA_PROVEEDOR;
  protected readonly isEdit = signal(false);
  protected readonly isLoading = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly categorias = signal<ProveedorCategoria[]>([]);
  protected readonly selectedCategoriaIds = signal<number[]>([]);
  protected readonly nuevasCategorias = signal<string[]>([]);
  protected nuevaCategoria = '';
  private proveedorId: number | null = null;

  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    tipoPersona: [2, Validators.required],
    identificador: [''],
    email: [''],
    contacto: [''],
    telefonos: [''],
    direccion: [''],
    descripcion: [''],
  });

  protected get pageTitle(): string {
    return this.isEdit() ? 'Editar proveedor' : 'Nuevo proveedor';
  }

  ngOnInit(): void {
    this.categoriaService.list().subscribe({
      next: (categorias) => this.categorias.set(categorias),
      error: (err: Error) => this.errorMessage.set(err.message),
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (!id || id === 'nuevo') return;

    this.proveedorId = Number(id);
    this.isEdit.set(true);
    this.isLoading.set(true);
    this.proveedorService.get(this.proveedorId).subscribe({
      next: (proveedor) => {
        this.form.patchValue({
          nombre: proveedor.nombre,
          tipoPersona: proveedor.tipoPersona || 2,
          identificador: proveedor.identificador ?? '',
          email: proveedor.email ?? '',
          contacto: proveedor.contacto ?? '',
          telefonos: proveedor.telefonos ?? '',
          direccion: proveedor.direccion ?? '',
          descripcion: proveedor.descripcion ?? '',
        });
        this.selectedCategoriaIds.set(proveedor.categorias.map((item) => item.id));
        this.isLoading.set(false);
      },
      error: (err: Error) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.message);
      },
    });
  }

  protected toggleCategoria(id: number, checked: boolean): void {
    this.selectedCategoriaIds.update((current) => {
      if (checked) {
        return current.includes(id) ? current : [...current, id];
      }
      return current.filter((item) => item !== id);
    });
  }

  protected isCategoriaSelected(id: number): boolean {
    return this.selectedCategoriaIds().includes(id);
  }

  protected agregarCategoria(): void {
    const nombre = this.nuevaCategoria.trim();
    if (!nombre) return;
    const exists = this.categorias().some((item) => item.nombre.toLowerCase() === nombre.toLowerCase());
    const alreadyNew = this.nuevasCategorias().some((item) => item.toLowerCase() === nombre.toLowerCase());
    if (exists || alreadyNew) {
      this.nuevaCategoria = '';
      return;
    }
    this.nuevasCategorias.update((list) => [...list, nombre]);
    this.nuevaCategoria = '';
  }

  protected quitarNuevaCategoria(nombre: string): void {
    this.nuevasCategorias.update((list) => list.filter((item) => item !== nombre));
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage.set('Completa los campos obligatorios.');
      return;
    }

    const raw = this.form.getRawValue();
    const payload = {
      nombre: raw.nombre.trim(),
      identificador: raw.identificador.trim(),
      tipoPersona: Number(raw.tipoPersona),
      email: raw.email.trim(),
      contacto: raw.contacto.trim(),
      telefonos: raw.telefonos.trim(),
      direccion: raw.direccion.trim(),
      descripcion: raw.descripcion.trim(),
      categoriasId: [...this.selectedCategoriaIds(), ...this.nuevasCategorias()],
    };

    this.isSaving.set(true);
    this.errorMessage.set(null);
    const req$ =
      this.isEdit() && this.proveedorId
        ? this.proveedorService.update(this.proveedorId, payload)
        : this.proveedorService.create(payload);

    req$.subscribe({
      next: ({ mensaje }) => {
        this.isSaving.set(false);
        void this.router.navigate(['/dashboard/compras/proveedores'], {
          state: { successMessage: mensaje },
        });
      },
      error: (err: Error) => {
        this.isSaving.set(false);
        this.errorMessage.set(err.message);
      },
    });
  }
}
