export interface Pelicula {
  fechaEstreno?: string;
  preventaHabilitada?: boolean;
  precioPreventa?: number;
  diasPreventa?: number;
  activa?: boolean;
  id: number;
  nombre: string;
  sinopsis: string;
  duracionMinutos: number;
  imagenUrl: string;
  generos: string[];
  edadMinima: 0 | 13 | 16 | 18;
  cantidadVendida: number;
}
