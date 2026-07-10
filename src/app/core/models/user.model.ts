export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'operador' | 'visor';
  avatar?: string;
}

export interface LoginCredentials {
  usuario: string;
  password: string;
}
