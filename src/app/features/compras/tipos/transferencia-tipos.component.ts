import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TransferenciaTipo } from '../../../core/models/transferencia.model';
import { TransferenciaTipoService } from '../../../core/services/transferencia-tipo.service';

@Component({
  selector: 'app-transferencia-tipos',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './transferencia-tipos.component.html',
  styleUrl: './transferencia-tipos.component.scss',
})
export class TransferenciaTiposComponent implements OnInit {
  private readonly tipoService = inject(TransferenciaTipoService);
  private readonly fb = inject(FormBuilder);

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly tipos = signal<TransferenciaTipo[]>([]);
  protected readonly editingId = signal<number | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(80)]],
    requiereProveedor: [false],
    aplicaCxp: [false],
  });

  ngOnInit(): void {
    this.cargar();
  }

  protected editar(tipo: TransferenciaTipo): void {
    this.editingId.set(tipo.id);
    this.form.patchValue({
      nombre: tipo.nombre,
      requiereProveedor: tipo.requiereProveedor === true,
      aplicaCxp: tipo.aplicaCxp === true,
    });
    this.errorMessage.set(null);
  }

  protected cancelarEdicion(): void {
    this.editingId.set(null);
    this.form.reset({ nombre: '', requiereProveedor: false, aplicaCxp: false });
  }

  protected guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage.set('El nombre es obligatorio.');
      return;
    }
    const raw = this.form.getRawValue();
    const editingId = this.editingId();
    this.saving.set(true);
    this.errorMessage.set(null);
    const req$ = editingId
      ? this.tipoService.update(editingId, raw)
      : this.tipoService.create(raw);
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

  protected setEstado(tipo: TransferenciaTipo, activo: boolean): void {
    this.tipoService.setEstado(tipo.id, activo).subscribe({
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
    this.tipoService.loadTodos().subscribe({
      next: (tipos) => {
        this.tipos.set(tipos);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.loading.set(false);
        this.errorMessage.set(err.message);
      },
    });
  }
}
