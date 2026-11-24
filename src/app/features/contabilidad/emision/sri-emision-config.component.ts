import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SriConfig } from '../../../core/models/sri-config.model';
import { SriConfigService } from '../../../core/services/sri-config.service';

@Component({
  selector: 'app-sri-emision-config',
  imports: [ReactiveFormsModule],
  templateUrl: './sri-emision-config.component.html',
  styleUrl: './sri-emision-config.component.scss',
})
export class SriEmisionConfigComponent implements OnInit {
  private readonly api = inject(SriConfigService);
  private readonly fb = inject(FormBuilder);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly uploading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly config = signal<SriConfig | null>(null);
  protected readonly fileName = signal('');
  protected readonly showPassword = signal(false);
  private archivo: File | null = null;

  protected readonly form = this.fb.nonNullable.group({
    ambiente: ['pruebas' as 'pruebas' | 'produccion', Validators.required],
    ruc: ['', Validators.required],
    razon_social: ['', Validators.required],
    nombre_comercial: [''],
    dir_matriz: [''],
    dir_establecimiento: [''],
    obligado_contabilidad: ['SI'],
    contribuyente_especial: [''],
    estab: ['001', Validators.required],
    pto_factura: ['001'],
    pto_nc: ['001'],
    pto_nd: ['001'],
    pto_guia: ['002'],
    pto_retencion: ['001'],
    dias_aviso: [30, Validators.required],
  });

  protected readonly certForm = this.fb.nonNullable.group({
    password: ['', Validators.required],
  });

  ngOnInit(): void {
    this.api.get().subscribe({
      next: (cfg) => {
        this.applyConfig(cfg);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.loading.set(false);
        this.errorMessage.set(err.message);
      },
    });
  }

  protected guardar(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.api.save(this.form.getRawValue()).subscribe({
      next: (res) => {
        this.saving.set(false);
        this.applyConfig(res.config);
        this.successMessage.set(res.mensaje);
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.errorMessage.set(err.message);
      },
    });
  }

  protected onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.setArchivo(input.files && input.files[0] ? input.files[0] : null);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0] ?? null;
    this.setArchivo(file);
  }

  protected titularCert(): string {
    return this.dnValor(this.config()?.certificado?.subject, 'CN') || 'Certificado cargado';
  }

  protected emisorCert(): string {
    const issuer = this.config()?.certificado?.issuer ?? '';
    return this.dnValor(issuer, 'O') || this.dnValor(issuer, 'CN') || issuer;
  }

  protected identificacionCert(): string {
    const serial = this.dnValor(this.config()?.certificado?.subject, 'serialNumber');
    return serial.split('-')[0] || this.config()?.certificado?.ruc || '—';
  }

  protected fechaCorta(valor?: string | null): string {
    if (!valor) return '—';
    const d = new Date(valor.includes('T') ? valor : valor.replace(' ', 'T'));
    if (Number.isNaN(d.getTime())) return valor;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}/${d.getFullYear()}`;
  }

  protected estadoFirma(): 'ok' | 'por_vencer' | 'vencido' | 'sin_certificado' {
    return this.config()?.alerta?.estado ?? 'sin_certificado';
  }

  protected etiquetaEstado(): string {
    const estado = this.estadoFirma();
    if (estado === 'ok') return 'Vigente';
    if (estado === 'por_vencer') return 'Por vencer';
    if (estado === 'vencido') return 'Vencido';
    return 'Sin certificado';
  }

  private setArchivo(file: File | null): void {
    if (file && !/\.(p12|pfx)$/i.test(file.name)) {
      this.errorMessage.set('El archivo debe ser .p12 o .pfx.');
      return;
    }
    this.archivo = file;
    this.fileName.set(file ? file.name : '');
  }

  private dnValor(dn: string | null | undefined, clave: string): string {
    if (!dn) return '';
    const re = new RegExp(`(?:^|,\\s*)${clave}\\s*=\\s*([^,]+)`, 'i');
    const m = dn.match(re);
    return m ? m[1].trim() : '';
  }

  protected subirCertificado(): void {
    if (this.uploading()) return;
    if (!this.archivo) {
      this.errorMessage.set('Seleccione el archivo .p12 o .pfx de la firma electrónica.');
      return;
    }
    if (this.certForm.invalid) {
      this.certForm.markAllAsTouched();
      return;
    }
    this.uploading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.api.subirCertificado(this.archivo, this.certForm.controls.password.value).subscribe({
      next: (res) => {
        this.uploading.set(false);
        this.applyConfig(res.config);
        this.successMessage.set(res.mensaje);
        this.certForm.reset({ password: '' });
        this.archivo = null;
        this.fileName.set('');
      },
      error: (err: Error) => {
        this.uploading.set(false);
        this.errorMessage.set(err.message);
      },
    });
  }

  private applyConfig(cfg: SriConfig): void {
    this.config.set(cfg);
    this.form.patchValue({
      ambiente: cfg.ambiente === 'produccion' ? 'produccion' : 'pruebas',
      ruc: cfg.ruc ?? '',
      razon_social: cfg.razon_social ?? '',
      nombre_comercial: cfg.nombre_comercial ?? '',
      dir_matriz: cfg.dir_matriz ?? '',
      dir_establecimiento: cfg.dir_establecimiento ?? '',
      obligado_contabilidad: cfg.obligado_contabilidad ?? 'SI',
      contribuyente_especial: cfg.contribuyente_especial ?? '',
      estab: cfg.estab ?? '001',
      pto_factura: cfg.pto_factura ?? '001',
      pto_nc: cfg.pto_nc ?? '001',
      pto_nd: cfg.pto_nd ?? '001',
      pto_guia: cfg.pto_guia ?? '002',
      pto_retencion: cfg.pto_retencion ?? '001',
      dias_aviso: cfg.dias_aviso ?? 30,
    });
  }
}
