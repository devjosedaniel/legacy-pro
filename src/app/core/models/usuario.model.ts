export type UsuarioRol = 'ROL_ADMIN' | 'ROL_USER';

export interface SistemaUsuario {
  id: string;
  usuario: string;
  nombre: string;
  email: string;
  rol: UsuarioRol;
  perfilId: string;
  perfilNombre: string;
  empresaId: number;
  mensajeria: boolean;
  ultimaConexion?: string;
}

export interface UsuarioFormData {
  usuario: string;
  nombre: string;
  email: string;
  password: string;
  rol: UsuarioRol;
  perfilId: string;
  mensajeria: boolean;
}

export const USUARIO_ROLES: { value: UsuarioRol; label: string }[] = [
  { value: 'ROL_ADMIN', label: 'Administrador' },
  { value: 'ROL_USER', label: 'Usuario' },
];
