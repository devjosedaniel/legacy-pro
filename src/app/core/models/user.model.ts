export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'operador' | 'visor';
  avatar?: string;
  perfilId?: string;
  directorios: number[];
}

export interface LoginCredentials {
  usuario: string;
  password: string;
}
