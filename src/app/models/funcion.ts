export interface Funcion {
  precioNormal?: number;
  esPreventa?: boolean;
  id: number;
  peliculaId: number;
  fecha: string;
  hora: string;
  salaNumero: number;
  formato: '2D' | '3D' | '4D' | '5D';
  idioma: 'Castellano' | 'Subtitulada';
  precio: number;
}
