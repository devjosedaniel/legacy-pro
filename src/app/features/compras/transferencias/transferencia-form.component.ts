import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TransferenciaTipo } from '../../../core/models/transferencia.model';
import { BancoService } from '../../../core/services/banco.service';
import { ProveedorService } from '../../../core/services/proveedor.service';
import { TransferenciaTipoService } from '../../../core/services/transferencia-tipo.service';
import { TransferenciaService } from '../../../core/services/transferencia.service';
import {
  SearchSelectComponent,
  SearchSelectOption,
} from '../../../shared/components/search-select/search-select.component';

@Component({
  selector: 'app-transferencia-form',
  imports: [ReactiveFormsModule, RouterLink, SearchSelectComponent],
  templateUrl: './transferencia-form.component.html',
  styleUrl: './transferencia-form.component.scss',
})
export class TransferenciaFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly transferenciaService = inject(TransferenciaService);
  private readonly tipoService = inject(TransferenciaTipoService);
  private readonly proveedorService = inject(ProveedorService);
  private readonly bancoService = inject(BancoService);
  private readonly router = inject(Router);

  protected readonly tipos = signal<TransferenciaTipo[]>([]);
  protected readonly isSaving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly bancos = this.bancoService.all;
  protected readonly proveedores = this.proveedorService.all;
  protected readonly tipoIdActual = signal<number | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    fecha: [this.hoy(), Validators.required],
    tipoId: ['' as string, Validators.required],
    valor: [null as number | null, [Validators.required, Validators.min(0.01)]],
    motivo: [''],
    proveedorId: [''],
    beneficiario: [''],
    bancoId: [''],
    referenciaBanco: [''],
  });

  protected readonly tipoSeleccionado = computed(() => {
    const id = this.tipoIdActual();
    return this.tipos().find((tipo) => tipo.id === id) ?? null;
  });

  protected readonly requiereProveedor = computed(
    () => this.tipoSeleccionado()?.requiereProveedor === true,
  );

  protected readonly proveedorOptions = computed((): SearchSelectOption[] =>
    this.proveedores()
      .filter((item) => item.activo)
      .map((item) => ({ value: item.id, label: item.nombre, hint: item.identificador })),
  );

  ngOnInit(): void {
    this.proveedorService.ensureLoaded().subscribe({
      error: (err: Error) => this.errorMessage.set(err.message),
    });
    this.bancoService.ensureLoaded().subscribe({
      error: (err: Error) => this.errorMessage.set(err.message),
    });
    this.tipoService.loadActivos().subscribe({
      next: (tipos) => {
        this.tipos.set(tipos);
        if (tipos.length && !this.form.controls.tipoId.value) {
          this.form.controls.tipoId.setValue(String(tipos[0].id));
          this.tipoIdActual.set(tipos[0].id);
          this.syncTipoValidators();
        }
      },
      error: (err: Error) => this.errorMessage.set(err.message),
    });
    this.syncTipoValidators();
  }

  protected onTipoChange(): void {
    const id = Number(this.form.controls.tipoId.value);
    this.tipoIdActual.set(Number.isNaN(id) ? null : id);
    this.syncTipoValidators();
    if (this.requiereProveedor()) {
      this.form.controls.beneficiario.setValue('');
    } else {
      this.form.controls.proveedorId.setValue('');
    }
  }

  protected onSubmit(): void {
    this.syncTipoValidators();
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage.set('Completa los campos obligatorios.');
      return;
    }

    const raw = this.form.getRawValue();
    const tipo = this.tipoSeleccionado();
    if (!tipo) {
      this.errorMessage.set('Selecciona un tipo.');
      return;
    }

    let beneficiario = raw.beneficiario.trim();
    let proveedorId: number | null = raw.proveedorId ? Number(raw.proveedorId) : null;

    if (tipo.requiereProveedor) {
      const proveedor = this.proveedores().find((item) => item.id === raw.proveedorId);
      beneficiario = proveedor?.nombre ?? beneficiario;
    } else {
      proveedorId = null;
    }

    this.isSaving.set(true);
    this.errorMessage.set(null);
    this.transferenciaService
      .create({
        fecha: raw.fecha,
        tipoId: tipo.id,
        valor: Number(raw.valor),
        motivo: raw.motivo.trim(),
        proveedorId,
        beneficiario,
        bancoId: raw.bancoId ? Number(raw.bancoId) : null,
        referenciaBanco: raw.referenciaBanco.trim(),
      })
      .subscribe({
        next: ({ transferencia, mensaje }) => {
          this.isSaving.set(false);
          void this.router.navigate(['/dashboard/compras/transferencias'], {
            state: { successMessage: mensaje || `Transferencia ${transferencia.numero} registrada.` },
          });
        },
        error: (err: Error) => {
          this.isSaving.set(false);
          this.errorMessage.set(err.message);
        },
      });
  }

  private syncTipoValidators(): void {
    const proveedor = this.form.controls.proveedorId;
    const beneficiario = this.form.controls.beneficiario;
    if (this.requiereProveedor()) {
      proveedor.setValidators([Validators.required]);
      beneficiario.clearValidators();
    } else {
      proveedor.clearValidators();
      beneficiario.setValidators([Validators.required]);
    }
    proveedor.updateValueAndValidity({ emitEvent: false });
    beneficiario.updateValueAndValidity({ emitEvent: false });
  }

  private hoy(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }
}
