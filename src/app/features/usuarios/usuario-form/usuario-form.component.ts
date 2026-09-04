import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { USUARIO_ROLES, UsuarioFormData, UsuarioRol } from '../../../core/models/usuario.model';
import { PerfilService } from '../../../core/services/perfil.service';
import { UsuarioService } from '../../../core/services/usuario.service';

@Component({
  selector: 'app-usuario-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './usuario-form.component.html',
  styleUrl: './usuario-form.component.scss',
})
export class UsuarioFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly usuarioService = inject(UsuarioService);
  private readonly perfilService = inject(PerfilService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly roles = USUARIO_ROLES;
  protected readonly perfiles = this.perfilService.all;
  protected readonly isEdit = signal(false);
  protected readonly isLoading = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly showPassword = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  private usuarioId: string | null = null;

  protected readonly form = this.fb.nonNullable.group({
    usuario: ['', [Validators.required, Validators.minLength(3)]],
    nombre: [''],
    email: ['', [Validators.email]],
    password: ['', [Validators.required, Validators.minLength(4)]],
    rol: ['ROL_USER' as UsuarioRol, Validators.required],
    perfilId: ['', Validators.required],
    mensajeria: [false],
  });

  protected get pageTitle(): string {
    return this.isEdit() ? 'Editar usuario' : 'Nuevo usuario';
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.perfilService.ensureLoaded().subscribe({
      error: (err: Error) => this.errorMessage.set(err.message),
    });

    if (!id) {
      return;
    }

    this.usuarioId = id;
    this.isEdit.set(true);
    this.form.controls.password.clearValidators();
    this.form.controls.password.updateValueAndValidity();
    this.isLoading.set(true);

    forkJoin({
      perfiles: this.perfilService.ensureLoaded(),
      usuario: this.usuarioService.fetchById(id),
    }).subscribe({
      next: ({ usuario }) => {
        this.form.patchValue({
          usuario: usuario.usuario,
          nombre: usuario.nombre,
          email: usuario.email,
          password: '',
          rol: usuario.rol,
          perfilId: usuario.perfilId,
          mensajeria: usuario.mensajeria,
        });
        this.isLoading.set(false);
      },
      error: (err: Error) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.message);
      },
    });
  }

  protected onSubmit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const value = this.form.getRawValue();
    const data: UsuarioFormData = {
      usuario: value.usuario,
      nombre: value.nombre,
      email: value.email,
      password: value.password,
      rol: value.rol,
      perfilId: value.perfilId,
      mensajeria: value.mensajeria,
    };

    this.isSaving.set(true);
    this.errorMessage.set(null);

    const request = this.isEdit() && this.usuarioId
      ? this.usuarioService.update(this.usuarioId, data)
      : this.usuarioService.create(data);

    request.subscribe({
      next: () => {
        this.isSaving.set(false);
        void this.router.navigate(['/dashboard/usuarios'], {
          state: {
            successMessage: this.isEdit()
              ? 'Usuario actualizado correctamente.'
              : 'Usuario agregado correctamente.',
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
