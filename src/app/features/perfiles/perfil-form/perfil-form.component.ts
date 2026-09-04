import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PERMISO_MODULOS, PermisoModulo } from '../../../core/models/permiso.model';
import { PerfilFormData } from '../../../core/models/perfil.model';
import { PerfilService } from '../../../core/services/perfil.service';

@Component({
  selector: 'app-perfil-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './perfil-form.component.html',
  styleUrl: './perfil-form.component.scss',
})
export class PerfilFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly perfilService = inject(PerfilService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly modulos = PERMISO_MODULOS;
  protected readonly isEdit = signal(false);
  protected readonly isLoading = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly selectedIds = signal<Set<number>>(new Set());
  protected readonly openModules = signal<Set<string>>(new Set(['inventario', 'sistema']));

  private perfilId: string | null = null;

  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.minLength(3)]],
    correoTrabajos: [false],
  });

  protected get pageTitle(): string {
    return this.isEdit() ? 'Editar perfil' : 'Nuevo perfil';
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;

    this.perfilId = id;
    this.isEdit.set(true);
    this.isLoading.set(true);

    this.perfilService.fetchById(id).subscribe({
      next: (perfil) => {
        this.form.patchValue({
          nombre: perfil.nombre,
          correoTrabajos: perfil.correoTrabajos,
        });
        this.selectedIds.set(new Set(perfil.directorios));
        this.openModules.set(
          new Set(
            this.modulos
              .filter((modulo) => modulo.paginas.some((pagina) => perfil.directorios.includes(pagina.id)))
              .map((modulo) => modulo.id)
              .concat('inventario', 'sistema'),
          ),
        );
        this.isLoading.set(false);
      },
      error: (err: Error) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.message);
      },
    });
  }

  protected isOpen(moduleId: string): boolean {
    return this.openModules().has(moduleId);
  }

  protected toggleModule(moduleId: string): void {
    this.openModules.update((current) => {
      const next = new Set(current);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });
  }

  protected isChecked(id: number): boolean {
    return this.selectedIds().has(id);
  }

  protected togglePagina(id: number, checked: boolean): void {
    this.selectedIds.update((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  protected selectedCount(modulo: PermisoModulo): number {
    return modulo.paginas.filter((pagina) => this.selectedIds().has(pagina.id)).length;
  }

  protected allSelected(modulo: PermisoModulo): boolean {
    return modulo.paginas.length > 0 && this.selectedCount(modulo) === modulo.paginas.length;
  }

  protected toggleAll(modulo: PermisoModulo, checked: boolean): void {
    this.selectedIds.update((current) => {
      const next = new Set(current);
      for (const pagina of modulo.paginas) {
        if (checked) next.add(pagina.id);
        else next.delete(pagina.id);
      }
      return next;
    });
  }

  protected onSubmit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const data: PerfilFormData = {
      nombre: this.form.controls.nombre.value,
      correoTrabajos: this.form.controls.correoTrabajos.value,
      directorios: [...this.selectedIds()],
    };

    this.isSaving.set(true);
    this.errorMessage.set(null);

    const request =
      this.isEdit() && this.perfilId
        ? this.perfilService.update(this.perfilId, data)
        : this.perfilService.create(data);

    request.subscribe({
      next: () => {
        this.isSaving.set(false);
        void this.router.navigate(['/dashboard/perfiles'], {
          state: {
            successMessage: this.isEdit()
              ? 'Perfil actualizado correctamente.'
              : 'Perfil agregado correctamente.',
          },
        });
      },
      error: (err: Error) => {
        this.isSaving.set(false);
        this.errorMessage.set(err.message);
      },
    });
  }
}
