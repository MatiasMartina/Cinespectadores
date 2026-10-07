import { Butaca } from './butaca';
import { Funcion } from './funcion';

export interface Sala {
  id: number;
  numero: number;
  nombre: string;
  activa: boolean;
  formatos: Funcion['formato'][];
  butacas: Butaca[];
}
