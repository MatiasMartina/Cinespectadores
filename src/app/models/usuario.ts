export interface Usuario {
  id: number;
  authId: string;
  nombre: string;
  apellido: string;
  email: string;
  fechaNacimiento: string;
  rol?: 'cliente' | 'admin' | 'empleado';
  primeraCompraRealizada?: boolean;
  puntos?: number;
  credito?: number;
}

export interface DatosEmpleado {
  nombre: string;
  apellido: string;
  email: string;
  contrasena: string;
  rol?: 'empleado' | 'admin';
}
