export interface Cupon {
  id: number;
  codigo: string;
  descripcion: string;
  porcentajeDescuento: number;
  edadMinima?: number;
  activo: boolean;
}
export interface ResultadoCupon {
  valido: boolean;
  mensaje: string;
  cupon?: Cupon;
}
