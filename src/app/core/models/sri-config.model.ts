export interface SriCertificadoInfo {
  cargado: boolean;
  nombre?: string | null;
  subject?: string | null;
  issuer?: string | null;
  serial?: string | null;
  ruc?: string | null;
  valid_from?: string | null;
  valid_to?: string | null;
  alerta_validacion?: string | null;
}

export interface SriCertificadoAlerta {
  tiene_certificado: boolean;
  vence?: string | null;
  dias_restantes?: number | null;
  estado: 'ok' | 'sin_certificado' | 'por_vencer' | 'vencido';
  mensaje?: string | null;
}

export interface SriConfig {
  ambiente: 'pruebas' | 'produccion';
  ambiente_codigo: string;
  ruc: string;
  razon_social: string;
  nombre_comercial: string;
  dir_matriz: string;
  dir_establecimiento: string;
  obligado_contabilidad: string;
  contribuyente_especial: string;
  estab: string;
  pto_factura: string;
  pto_nc: string;
  pto_nd: string;
  pto_guia: string;
  pto_retencion: string;
  dias_aviso: number;
  tiene_password: boolean;
  certificado: SriCertificadoInfo;
  alerta: SriCertificadoAlerta;
}
