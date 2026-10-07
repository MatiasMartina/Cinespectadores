import { Entrada } from './entrada';

export type SectorValidacion = 'cine' | 'candy';

export interface ValidacionVenta {
  empleadoId: number;
  fecha: string;
}

export interface Venta {
  poster?: string;
  puntajePropio?: number;
  cancelacion?: {
    fecha: string;
    credito: number;
    puntosDevueltos: number;
    puntosRevertidos: number;
  };
  entrada: Entrada;
  usuarioId?: number;
  fechaCompra: string;
  ingreso?: ValidacionVenta;
  candy?: ValidacionVenta;
}

export interface ResultadoVenta {
  valido: boolean;
  mensaje: string;
  venta?: Venta;
}
