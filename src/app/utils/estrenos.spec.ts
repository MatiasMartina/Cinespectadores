import {
  estadoVenta,
  fechaArgentina,
  precioVigente,
  puedeCancelar,
  rangoPeriodo,
} from './estrenos';
import { Pelicula } from '../models/pelicula';
import { Funcion } from '../models/funcion';
import { Venta } from '../models/venta';
const pelicula: Pelicula = {
  id: 1,
  nombre: 'Estreno',
  sinopsis: 'Prueba',
  duracionMinutos: 100,
  imagenUrl: 'https://example.test/poster.jpg',
  generos: ['Drama'],
  edadMinima: 0,
  cantidadVendida: 0,
  activa: true,
  fechaEstreno: '2026-10-20',
  preventaHabilitada: true,
  precioPreventa: 6000,
};
const funcion: Funcion = {
  id: 1,
  peliculaId: 1,
  salaNumero: 1,
  fecha: '2026-10-20',
  hora: '18:00',
  formato: '2D',
  idioma: 'Castellano',
  precio: 8000,
};
describe('Estrenos, períodos y cancelación', () => {
  it('abre la preventa siete días antes, usa precio especial y restaura el normal el día del estreno', () => {
    expect(estadoVenta(pelicula, '2026-10-12')).toBe('proximamente');
    expect(estadoVenta(pelicula, '2026-10-13')).toBe('preventa');
    const cotizada = precioVigente(funcion, pelicula, '2026-10-13');
    expect(cotizada.precio).toBe(6000);
    expect(precioVigente(cotizada, pelicula, '2026-10-20').precio).toBe(8000);
    expect(estadoVenta(pelicula, '2026-10-20')).toBe('cartelera');
    expect(estadoVenta({ ...pelicula, diasPreventa: 3 }, '2026-10-16')).toBe('proximamente');
    expect(estadoVenta({ ...pelicula, activa: false }, '2026-10-19')).toBe('oculta');
  });
  it('usa la fecha argentina aunque UTC ya esté en el día siguiente', () => {
    expect(fechaArgentina(new Date('2026-10-13T01:00:00Z'))).toBe('2026-10-12');
  });
  it('permite cancelar hasta dos horas antes y bloquea compras usadas o canceladas', () => {
    const venta = { entrada: { fecha: '2026-10-20', hora: '18:00' } } as Venta;
    const limite = new Date('2026-10-20T16:00:00-03:00').getTime();
    expect(puedeCancelar(venta, limite)).toBe(true);
    expect(puedeCancelar(venta, limite + 1)).toBe(false);
    expect(
      puedeCancelar({ ...venta, ingreso: { empleadoId: 1, fecha: '2026-10-20' } }, limite),
    ).toBe(false);
    expect(
      puedeCancelar(
        {
          ...venta,
          cancelacion: {
            fecha: '2026-10-19',
            credito: 10,
            puntosDevueltos: 0,
            puntosRevertidos: 0,
          },
        },
        limite,
      ),
    ).toBe(false);
  });
  it('incluye toda la semana cruzando de mes y el febrero bisiesto', () => {
    expect(rangoPeriodo('2026-11-01', 'semana')).toEqual({
      desde: '2026-10-26',
      hasta: '2026-11-01',
    });
    expect(rangoPeriodo('2028-02-18', 'mes')).toEqual({ desde: '2028-02-01', hasta: '2028-02-29' });
  });
});
