import { CurrencyPipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SriRecibido } from '../../../core/models/sri-recibido.model';
import { SriRecibidoService } from '../../../core/services/sri-recibido.service';

@Component({
  selector: 'app-sri-recibido-detail',
  imports: [RouterLink, CurrencyPipe],
  templateUrl: './sri-recibido-detail.component.html',
  styleUrl: './sri-recibido-detail.component.scss',
})
export class SriRecibidoDetailComponent implements OnInit {
  private readonly api = inject(SriRecibidoService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly item = signal<SriRecibido | null>(null);
  protected readonly loading = signal(true);
  protected readonly consulting = signal(false);
  protected readonly downloading = signal<'pdf' | 'xml' | null>(null);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly ingresando = signal(false);
  protected readonly facturaElegidaId = signal<number | null>(null);
  protected readonly ingresado = signal(false);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.loading.set(false);
      this.errorMessage.set('Comprobante no válido.');
      return;
    }
    this.api.getById(id).subscribe({
      next: (doc) => {
        this.item.set(doc);
        this.preseleccionarFactura(doc);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.loading.set(false);
        this.errorMessage.set(err.message);
      },
    });
  }

  protected consultar(): void {
    const doc = this.item();
    if (!doc || this.consulting()) return;
    this.consulting.set(true);
    this.errorMessage.set(null);
    this.api.consultarUno(doc.id).subscribe({
      next: (actualizado) => {
        this.item.set(actualizado);
        this.preseleccionarFactura(actualizado);
        this.consulting.set(false);
        this.successMessage.set('Consulta al SRI: ' + actualizado.estado);
      },
      error: (err: Error) => {
        this.consulting.set(false);
        this.errorMessage.set(err.message);
      },
    });
  }

  protected download(kind: 'pdf' | 'xml'): void {
    const doc = this.item();
    if (!doc || this.downloading()) return;
    this.downloading.set(kind);
    this.errorMessage.set(null);
    const req = kind === 'pdf' ? this.api.downloadPdf(doc.id) : this.api.downloadXml(doc.id);
    req.subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = kind === 'pdf' ? `SRI-${doc.numero || doc.id}.pdf` : `sri-${doc.claveAcceso}.xml`;
        a.click();
        URL.revokeObjectURL(url);
        this.downloading.set(null);
      },
      error: (err: Error) => {
        this.downloading.set(null);
        this.errorMessage.set(err.message);
      },
    });
  }

  protected estadoSlug(estado: string): string {
    return estado.toLowerCase().replace(/\s+/g, '-');
  }

  protected esRetencion(doc: SriRecibido): boolean {
    return doc.tipoComprobante === '07';
  }

  protected elegirFactura(id: number): void {
    this.facturaElegidaId.set(id);
  }

  protected puedeIngresar(doc: SriRecibido): boolean {
    if (!this.esRetencion(doc) || doc.estado !== 'AUTORIZADO' || this.ingresado()) return false;
    const facturas = doc.facturaVinculo?.facturas ?? [];
    const elegida = facturas.find((f) => f.id === this.facturaElegidaId());
    return !!elegida?.puedeIngresar;
  }

  protected ingresar(): void {
    const doc = this.item();
    if (!doc || this.ingresando() || !this.puedeIngresar(doc)) return;
    this.ingresando.set(true);
    this.errorMessage.set(null);
    this.api.ingresarRetencion(doc.id, this.facturaElegidaId() ?? undefined).subscribe({
      next: (mensaje) => {
        this.ingresando.set(false);
        this.ingresado.set(true);
        void this.router.navigate(['/dashboard/contabilidad/recibidos'], {
          state: { successMessage: mensaje },
        });
      },
      error: (err: Error) => {
        this.ingresando.set(false);
        this.errorMessage.set(err.message);
      },
    });
  }

  private preseleccionarFactura(doc: SriRecibido): void {
    const facturas = doc.facturaVinculo?.facturas ?? [];
    if (facturas.length === 1) {
      this.facturaElegidaId.set(facturas[0].id);
      return;
    }
    const actual = facturas.find((f) => f.id === this.facturaElegidaId());
    if (!actual) this.facturaElegidaId.set(null);
  }
}
