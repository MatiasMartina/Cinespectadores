import { ReporteDiario } from './beneficios';
export interface Notificacion {
  id: number;
  peliculaId: number;
  titulo: string;
  mensaje: string;
  fecha: string;
  leida: boolean;
}
export interface MovimientoCredito {
  id: number;
  fecha: string;
  importe: number;
  tipo: 'cancelacion' | 'pago';
  codigoVenta: string;
  detalle: string;
}
export interface Actividad {
  id: number;
  fecha: string;
  autor: string;
  accion: string;
  entidad: string;
  referencia: string;
  detalle: { anterior?: Record<string, unknown>; actual?: Record<string, unknown> };
}
export interface ReportePeriodo {
  desde: string;
  hasta: string;
  dias: ReporteDiario[];
  peliculas: { peliculaId: number; nombre: string; entradas: number }[];
  productos: { productoId: number; nombre: string; cantidad: number }[];
}
