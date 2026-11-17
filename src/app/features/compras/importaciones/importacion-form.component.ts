import { CurrencyPipe } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Importacion, padImportacionSecuencia } from '../../../core/models/importacion.model';
import { ImportacionService } from '../../../core/services/importacion.service';

@Component({
  selector: 'app-importacion-form',
  imports: [RouterLink, ReactiveFormsModule, CurrencyPipe],
  templateUrl: './importacion-form.component.html',
  styleUrl: './importacion-form.component.scss',
})
export class ImportacionFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ImportacionService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly pad = padImportacionSecuencia;
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly editId = signal<number | null>(null);
  protected readonly secuencia = signal('');

  protected readonly form = this.fb.nonNullable.group({
    fecha: ['', Validators.required],
    compra: ['PROVEEDORES GRAFICOS', Validators.required],
    valorcompra: [0, Validators.required],
    doc_compra: ['', Validators.required],
    comision: [0, Validators.required],
    porcentajeisd: [5, Validators.required],
    valorisd: [0],
    seguro: ['EQUINOCCIAL'],
    valorseguro: [0],
    doc_seguro: [''],
    transint1: ['PROVEXCAR CIA LTDA'],
    valortransint1: [0],
    doc_transint1: [''],
    transint2: ['PROVEXCAR CIA LTDA'],
    valortransint2: [0],
    doc_transint2: [''],
    arancel: [0],
    info_arancel: [''],
    doc_arancel: [''],
    almacenaje1: ['CONTECON'],
    valoralmacenaje1: [0],
    doc_almacenaje1: [''],
    almacenaje2: ['CONTECON'],
    valoralmacenaje2: [0],
    doc_almacenaje2: [''],
    transnac: ['LOGISTICSTRAN S.A'],
    valortransnac: [0],
    doc_transnac: [''],
    agente: ['SACIE SERVICIOS ADICIONALES'],
    valoragente: [0],
    doc_agente: [''],
    total_compra: [0],
    total_ctacobrar: [0],
    gastos: [0],
    porcentaje_gastos: [0],
    pago1: [0],
    pago2: [0],
    pago3: [0],
    transferencia: [0],
    detalles: this.fb.array<FormGroup>([]),
  });

  protected get detalles(): FormArray<FormGroup> {
    return this.form.controls.detalles;
  }

  ngOnInit(): void {
    this.agregarDetalle();
    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.recalcular());

    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam || idParam === 'nueva') {
      this.recalcular();
      return;
    }
    const id = Number(idParam);
    if (!id) {
      this.errorMessage.set('Importación no válida.');
      return;
    }
    this.editId.set(id);
    this.loading.set(true);
    this.api.getById(id).subscribe({
      next: (item) => {
        this.patchImportacion(item);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.loading.set(false);
        this.errorMessage.set(err.message);
      },
    });
  }

  protected lineaGroup(i: number): FormGroup {
    return this.detalles.at(i);
  }

  protected agregarDetalle(detalle?: {
    descripcion?: string;
    ancho?: number | null;
    alto?: number | null;
    unidades?: number | null;
    valorfob?: number | null;
  }): void {
    this.detalles.push(
      this.fb.group({
        descripcion: [detalle?.descripcion ?? '', Validators.required],
        ancho: [detalle?.ancho ?? 0, Validators.required],
        alto: [detalle?.alto ?? 0, Validators.required],
        unidades: [detalle?.unidades ?? 0, Validators.required],
        valorfob: [detalle?.valorfob ?? 0, Validators.required],
      }),
    );
  }

  protected quitarDetalle(i: number): void {
    if (this.detalles.length > 1) {
      this.detalles.removeAt(i);
    }
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.detalles.controls.forEach((g) => g.markAllAsTouched());
      this.errorMessage.set('Completa los campos obligatorios y al menos un detalle con descripción.');
      return;
    }
    this.saving.set(true);
    this.errorMessage.set(null);
    const data = this.form.getRawValue();
    const editId = this.editId();
    const req$ = editId ? this.api.update(editId, data) : this.api.create(data);
    req$.subscribe({
      next: (mensaje) => {
        this.saving.set(false);
        void this.router.navigate(['/dashboard/compras/importaciones'], {
          state: { successMessage: mensaje },
        });
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.errorMessage.set(err.message);
      },
    });
  }

  private patchImportacion(item: Importacion): void {
    this.secuencia.set(item.secuencia);
    this.form.patchValue(
      {
        fecha: item.fecha,
        compra: item.compra,
        valorcompra: item.valorcompra ?? 0,
        doc_compra: item.docCompra,
        comision: item.comision ?? 0,
        porcentajeisd: item.porcentajeisd ?? 0,
        valorisd: item.valorisd ?? 0,
        seguro: item.seguro,
        valorseguro: item.valorseguro ?? 0,
        doc_seguro: item.docSeguro,
        transint1: item.transint1,
        valortransint1: item.valortransint1 ?? 0,
        doc_transint1: item.docTransint1,
        transint2: item.transint2,
        valortransint2: item.valortransint2 ?? 0,
        doc_transint2: item.docTransint2,
        arancel: item.arancel ?? 0,
        info_arancel: item.infoArancel,
        doc_arancel: item.docArancel,
        almacenaje1: item.almacenaje1,
        valoralmacenaje1: item.valoralmacenaje1 ?? 0,
        doc_almacenaje1: item.docAlmacenaje1,
        almacenaje2: item.almacenaje2,
        valoralmacenaje2: item.valoralmacenaje2 ?? 0,
        doc_almacenaje2: item.docAlmacenaje2,
        transnac: item.transnac,
        valortransnac: item.valortransnac ?? 0,
        doc_transnac: item.docTransnac,
        agente: item.agente,
        valoragente: item.valoragente ?? 0,
        doc_agente: item.docAgente,
        total_compra: item.totalCompra ?? 0,
        total_ctacobrar: item.totalCtaCobrar ?? 0,
        gastos: item.gastos ?? 0,
        porcentaje_gastos: item.porcentajeGastos ?? 0,
        pago1: item.pago1 ?? 0,
        pago2: item.pago2 ?? 0,
        pago3: item.pago3 ?? 0,
        transferencia: item.transferencia ?? 0,
      },
      { emitEvent: false },
    );
    this.detalles.clear();
    if (item.detalles.length) {
      item.detalles.forEach((d) => this.agregarDetalle(d));
    } else {
      this.agregarDetalle();
    }
    this.recalcular();
  }

  private recalcular(): void {
    const n = (value: unknown) => {
      const num = Number(value);
      return Number.isFinite(num) ? num : 0;
    };
    const v = this.form.getRawValue();
    const compra = n(v.valorcompra);
    const isdPct = n(v.porcentajeisd);
    const valorisd = compra > 1000 ? this.round((compra - 1000) * (isdPct / 100)) : 0;
    const comision = n(v.comision);
    const seguro = n(v.valorseguro);
    const t1 = n(v.valortransint1);
    const t2 = n(v.valortransint2);
    const arancel = n(v.arancel);
    const a1 = n(v.valoralmacenaje1);
    const a2 = n(v.valoralmacenaje2);
    const tn = n(v.valortransnac);
    const agente = n(v.valoragente);
    const totalcompra = this.round(compra + comision + valorisd + seguro + t1 + t2 + arancel + a1 + a2 + tn + agente);
    const ctas = this.round(compra + valorisd + comision);
    const gastos = this.round(comision + valorisd + seguro + t1 + t2 + arancel + a1 + a2 + tn + agente);
    const pct = totalcompra > 0 ? this.round((gastos * 100) / totalcompra) : 0;
    this.form.patchValue(
      {
        valorisd,
        total_compra: totalcompra,
        total_ctacobrar: ctas,
        gastos,
        porcentaje_gastos: pct,
      },
      { emitEvent: false },
    );
  }

  private round(num: number): number {
    return Math.round((num + Number.EPSILON) * 100) / 100;
  }
}
