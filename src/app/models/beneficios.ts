export interface Combo {
  id: number;
  nombre: string;
  precio: number;
  pochoclosId: number;
  bebidaId: number;
  activo: boolean;
}
export interface Recompensa {
  id: number;
  nombre: string;
  tipo: 'entrada' | 'producto';
  productoId?: number;
  puntos: number;
  activa: boolean;
}
export interface CanjeSeleccionado {
  recompensaId: number;
  cantidad: number;
}
export interface MovimientoPuntos {
  id: number;
  fecha: string;
  tipo: 'acreditacion' | 'canje' | 'reversion' | 'devolucion';
  puntos: number;
  detalle: string;
  codigoVenta: string;
  cantidad: number;
}
export interface ReporteDiario {
  fecha: string;
  recaudacion: number;
  entradas: number;
  compras: number;
  cobradoTarjeta?: number;
  creditoUtilizado?: number;
}
