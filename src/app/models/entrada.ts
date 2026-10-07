export interface ItemCandyEntrada {
  productoId: number;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface Entrada {
  soloCandy?: boolean;
  creditoUtilizado?: number;
  pagoTarjeta?: number;
  esPreventa?: boolean;
  precioEntrada?: number;
  ahorroCombo?: number;
  descuentoCanjes?: number;
  descuentoPromocion?: number;
  comboNombre?: string;
  cantidadCombos?: number;
  puntosGanados?: number;
  puntosUsados?: number;
  canjes?: {
    recompensaId: number;
    nombre: string;
    cantidad: number;
    puntos: number;
    tipo: string;
  }[];
  peliculaId?: number;
  subtotal?: number;
  descuento?: number;
  beneficio?: string;
  edadMinima?: number;
  codigo: string;
  funcionId: number;
  pelicula: string;
  fecha: string;
  hora: string;
  salaNumero: number;
  formato: string;
  idioma: string;
  butacas: string[];
  productosCandy: ItemCandyEntrada[];
  total: number;
}
