import { Butaca } from '../models/butaca';

export function crearButacasSala(): Butaca[] {
  const filas = [
    'A',
    'B',
    'C',
    'D',
    'E',
    'F',
    'G',
    'H',
    'I',
    'AC',
    'L',
    'M',
    'N',
    'O',
    'P',
    'Q',
    'R',
    'S',
    'T',
  ];
  return filas.flatMap((fila) =>
    Array.from({ length: fila === 'AC' ? 14 : 28 }, (_, indice) => ({
      id: `${fila}-${indice + 1}`,
      fila,
      numero: indice + 1,
      habilitada: true,
      tipo: fila === 'AC' ? 'Accesible' : ['R', 'S', 'T'].includes(fila) ? 'VIP' : 'Comun',
    })),
  );
}
