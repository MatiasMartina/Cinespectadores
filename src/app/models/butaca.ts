export interface Butaca {
  habilitada?: boolean;
  id: string;
  fila: string;
  numero: number;
  tipo: 'Comun' | 'Accesible' | 'VIP';
}
