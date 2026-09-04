export interface PermisoPagina {
  id: number;
  slug: string;
  nombre: string;
  route?: string;
  available: boolean;
}

export interface PermisoModulo {
  id: string;
  nombre: string;
  icon: string;
  /** Si el perfil no tiene ninguna página de este módulo, se concede el módulo (compatibilidad). */
  defaultGrant?: boolean;
  paginas: PermisoPagina[];
}

/**
 * Catálogo de módulos/páginas.
 * Los `id` numéricos son los mismos de Serflex (`perfiles.directorios`).
 * Los 7xx son páginas nuevas de esta PWA.
 */
export const PERMISO_MODULOS: PermisoModulo[] = [
  {
    id: 'inventario',
    nombre: 'Inventario',
    icon: 'inventory',
    defaultGrant: true,
    paginas: [
      { id: 700, slug: 'inventario', nombre: 'Resumen', route: '/dashboard/inventario', available: true },
      { id: 701, slug: 'productos', nombre: 'Productos', route: '/dashboard/productos', available: true },
      { id: 702, slug: 'movimientos', nombre: 'Movimientos', route: '/dashboard/movimientos', available: true },
      { id: 703, slug: 'retazos', nombre: 'Retazos', route: '/dashboard/retazos', available: true },
      { id: 704, slug: 'reportes-inventario', nombre: 'Reportes', route: '/dashboard/reportes', available: true },
    ],
  },
  {
    id: 'trabajos',
    nombre: 'Trabajos',
    icon: 'work',
    paginas: [
      { id: 100, slug: 'trabajos-me', nombre: 'Mis trabajos', available: false },
      { id: 101, slug: 'trabajo-nuevo', nombre: 'Trabajo nuevo', available: false },
      { id: 102, slug: 'trabajos-bitacoras', nombre: 'Bitácoras', available: false },
      { id: 103, slug: 'trabajos-planificacion', nombre: 'Planificación', available: false },
      { id: 104, slug: 'trabajos-distribucion', nombre: 'Distribución', available: false },
      { id: 105, slug: 'trabajos-aprobar', nombre: 'Aprobar', available: false },
      { id: 106, slug: 'trabajos-anular', nombre: 'Anular', available: false },
    ],
  },
  {
    id: 'produccion',
    nombre: 'Producción',
    icon: 'production',
    paginas: [
      { id: 200, slug: 'produccion', nombre: 'Órdenes de producción', available: false },
      { id: 201, slug: 'produccion-planificacion', nombre: 'Planificación', available: false },
      {
        id: 202,
        slug: 'produccion-reportes',
        nombre: 'Reportes',
        route: '/dashboard/produccion/reportes',
        available: true,
      },
    ],
  },
  {
    id: 'ventas',
    nombre: 'Ventas',
    icon: 'sales',
    paginas: [
      { id: 300, slug: 'cotizaciones', nombre: 'Cotizaciones', available: false },
      { id: 301, slug: 'clientes', nombre: 'Clientes', available: false },
    ],
  },
  {
    id: 'compras',
    nombre: 'Compras',
    icon: 'purchase',
    paginas: [],
  },
  {
    id: 'contabilidad',
    nombre: 'Contabilidad',
    icon: 'accounting',
    paginas: [],
  },
  {
    id: 'talento-humano',
    nombre: 'Talento humano',
    icon: 'users',
    paginas: [{ id: 600, slug: 'organigrama', nombre: 'Organigrama', available: false }],
  },
  {
    id: 'configuracion',
    nombre: 'Configuración',
    icon: 'settings',
    paginas: [
      { id: 500, slug: 'especificaciones', nombre: 'Especificaciones', available: false },
      { id: 501, slug: 'errores', nombre: 'Errores', available: false },
      { id: 502, slug: 'calibres', nombre: 'Calibres', available: false },
      { id: 503, slug: 'etapas', nombre: 'Etapas', available: false },
      { id: 504, slug: 'productos-config', nombre: 'Productos', available: false },
      { id: 505, slug: 'precios-especiales', nombre: 'Precios especiales', available: false },
      { id: 506, slug: 'imprentas', nombre: 'Imprentas', available: false },
    ],
  },
  {
    id: 'sistema',
    nombre: 'Sistema',
    icon: 'system',
    paginas: [
      { id: 400, slug: 'usuarios', nombre: 'Usuarios', route: '/dashboard/usuarios', available: true },
      { id: 401, slug: 'perfiles', nombre: 'Perfiles y permisos', route: '/dashboard/perfiles', available: true },
      { id: 402, slug: 'empresa', nombre: 'Empresa', available: false },
    ],
  },
];
