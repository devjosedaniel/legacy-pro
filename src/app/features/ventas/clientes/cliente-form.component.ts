import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ClienteFormData } from '../../../core/models/cliente.model';
import { CIUDADES_POR_PAIS, EMPRESAS_CLIENTE, PAISES_CLIENTE } from '../../../core/models/geo.const';
import { ClienteService } from '../../../core/services/cliente.service';
import { UsuarioService } from '../../../core/services/usuario.service';

@Component({
  selector: 'app-cliente-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './cliente-form.component.html',
  styleUrl: './cliente-form.component.scss',
})
export class ClienteFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly clienteService = inject(ClienteService);
  private readonly usuarioService = inject(UsuarioService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly paises = PAISES_CLIENTE;
  protected readonly empresas = EMPRESAS_CLIENTE;
  protected readonly usuarios = this.usuarioService.all;
  protected readonly isEdit = signal(false);
  protected readonly isLoading = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly showPassword = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  private clienteId: number | null = null;

  protected readonly form = this.fb.nonNullable.group({
    nombres: ['', Validators.required],
    tipoIdentificador: ['RUC', Validators.required],
    identificador: ['', Validators.required],
    empresaId: [1, Validators.required],
    pais: ['Ecuador', Validators.required],
    ciudad: ['', Validators.required],
    direccion: [''],
    telefono: [''],
    movil: [''],
    contacto: [''],
    credito: [0],
    maxFechaFact: [null as number | null],
    agenteRetencion: [false],
    vendedorId: [null as number | null],
    valorMinimo: [null as number | null],
    verPrecios: [false],
    montaje: [false],
    email1: [''],
    email2: [''],
    email3: [''],
    email4: [''],
    emailCobranza: [''],
    usuario: [''],
    password: [''],
  });

  protected readonly ciudades = computed(() => CIUDADES_POR_PAIS[this.form.controls.pais.value] ?? []);

  protected get pageTitle(): string {
    return this.isEdit() ? 'Información de cliente' : 'Nuevo cliente';
  }

  ngOnInit(): void {
    this.usuarioService.load().subscribe();
    const id = this.route.snapshot.paramMap.get('id');
    if (!id || id === 'nuevo') return;

    this.clienteId = Number(id);
    this.isEdit.set(true);
    this.isLoading.set(true);
    this.clienteService.getById(this.clienteId).subscribe({
      next: (cliente) => {
        this.form.patchValue({
          nombres: cliente.nombres,
          tipoIdentificador: cliente.tipoIdentificador || 'RUC',
          identificador: cliente.identificador ?? '',
          empresaId: cliente.empresaId ?? 1,
          pais: cliente.pais || 'Ecuador',
          ciudad: cliente.ciudad ?? '',
          direccion: cliente.direccion ?? '',
          telefono: cliente.telefono ?? '',
          movil: cliente.movil ?? '',
          contacto: cliente.contacto ?? '',
          credito: cliente.credito ?? 0,
          maxFechaFact: cliente.maxFechaFact,
          agenteRetencion: cliente.agenteRetencion ?? false,
          vendedorId: cliente.vendedorId,
          valorMinimo: cliente.valorMinimo,
          verPrecios: cliente.verPrecios ?? false,
          montaje: cliente.montaje ?? false,
          email1: cliente.email1 ?? '',
          email2: cliente.email2 ?? '',
          email3: cliente.email3 ?? '',
          email4: cliente.email4 ?? '',
          emailCobranza: cliente.emailCobranza ?? '',
          usuario: cliente.usuario ?? '',
          password: cliente.password ?? '',
        });
        this.isLoading.set(false);
      },
      error: (err: Error) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.message);
      },
    });
  }

  protected onPaisChange(): void {
    const ciudades = CIUDADES_POR_PAIS[this.form.controls.pais.value] ?? [];
    if (!ciudades.includes(this.form.controls.ciudad.value)) {
      this.form.controls.ciudad.setValue('');
    }
  }

  protected asNumber(id: string): number {
    return Number(id);
  }

  protected generarClave(): void {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    let clave = '';
    for (let i = 0; i < 10; i++) {
      clave += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    this.form.controls.password.setValue(clave);
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const data: ClienteFormData = {
      ...raw,
      empresaId: Number(raw.empresaId),
      vendedorId: raw.vendedorId ? Number(raw.vendedorId) : null,
      valorMinimo: raw.valorMinimo === null || raw.valorMinimo === ('' as unknown) ? null : Number(raw.valorMinimo),
      maxFechaFact: raw.maxFechaFact === null ? null : Number(raw.maxFechaFact),
    };

    this.isSaving.set(true);
    this.errorMessage.set(null);
    const request$ = this.isEdit() && this.clienteId
      ? this.clienteService.update(this.clienteId, data)
      : this.clienteService.create(data);

    request$.subscribe({
      next: (cliente) => {
        this.isSaving.set(false);
        const message = this.isEdit()
          ? 'Cliente actualizado correctamente.'
          : `Cliente ${cliente.nombres} agregado.`;
        void this.router.navigate(['/dashboard/ventas/clientes'], {
          state: { successMessage: message },
        });
      },
      error: (err: Error) => {
        this.isSaving.set(false);
        this.errorMessage.set(err.message);
      },
    });
  }
}
