export interface Perfil {
  id: string;
  nombre: string;
  directorios: number[];
  correoTrabajos: boolean;
}

export interface PerfilFormData {
  nombre: string;
  directorios: number[];
  correoTrabajos: boolean;
}
