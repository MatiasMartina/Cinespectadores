import { Supabase } from './supabase';
import { crearSupabaseDePrueba, prepararCatalogoDePrueba } from '../testing/supabase-pruebas';
import { TestBed } from '@angular/core/testing';
import { Usuarios } from './usuarios';
import { Funciones } from './funciones';

describe('Funciones', () => {
  let service: Funciones;
  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [{ provide: Supabase, useValue: crearSupabaseDePrueba() }],
    });
    await prepararCatalogoDePrueba();
    service = TestBed.inject(Funciones);
    await TestBed.inject(Usuarios).iniciarSesion('admin@cine.test', 'Prueba123!');
  });

  it('rechaza una función sin los 30 minutos y acepta el límite exacto', async () => {
    const fecha = service.getFuncionPorId(1)!.fecha;
    const datos = {
      peliculaId: 2,
      fecha,
      salaNumero: 1,
      formato: '2D' as const,
      idioma: 'Castellano' as const,
      precio: 7000,
    };
    expect(await service.agregarFuncion({ ...datos, hora: '21:15' })).toBeUndefined();
    expect(await service.agregarFuncion({ ...datos, hora: '21:16' })).toBeDefined();
  });

  it('controla los cruces aunque la función termine al día siguiente', async () => {
    const fecha = new Date(service.getFuncionPorId(2)!.fecha + 'T00:00:00');
    fecha.setDate(fecha.getDate() + 1);
    const siguiente = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
    const datos = {
      peliculaId: 2,
      fecha: siguiente,
      salaNumero: 2,
      formato: '2D' as const,
      idioma: 'Castellano' as const,
      precio: 7000,
    };
    expect(await service.agregarFuncion({ ...datos, hora: '00:45' })).toBeUndefined();
    expect(await service.agregarFuncion({ ...datos, hora: '00:46' })).toBeDefined();
  });

  it('asigna otra sala cuando la primera está ocupada y falla cuando no queda ninguna', async () => {
    const fecha = service.getFuncionPorId(1)!.fecha;
    const datos = {
      peliculaId: 1,
      fecha,
      hora: '10:00',
      formato: '2D' as const,
      idioma: 'Castellano' as const,
      precio: 8000,
    };
    const resultados = [];
    for (let i = 0; i < 4; i++) resultados.push(await service.guardarAutomatica(datos));
    expect(resultados.map((resultado) => resultado.funciones[0].salaNumero)).toEqual([1, 2, 3, 4]);
    expect((await service.guardarAutomatica(datos)).valido).toBe(false);
  });

  it('programa los días elegidos y no guarda parcialmente un lote con conflictos', async () => {
    const fecha = service.getFuncionPorId(1)!.fecha;
    const dia = new Date(fecha + 'T00:00:00').getDay();
    const datos = {
      peliculaId: 1,
      hora: '10:00',
      formato: '2D' as const,
      idioma: 'Castellano' as const,
      precio: 8000,
    };
    expect((await service.programarSemana(datos, fecha, fecha, [dia])).valido).toBe(true);
    for (let i = 0; i < 3; i++) await service.guardarAutomatica({ ...datos, fecha });
    const antes = service.getFunciones().length;
    expect((await service.programarSemana(datos, fecha, fecha, [dia])).valido).toBe(false);
    expect(service.getFunciones().length).toBe(antes);
  });

  it('rechaza datos imposibles y fechas inexistentes', async () => {
    expect(
      await service.agregarFuncion({
        peliculaId: 2,
        fecha: '2027-02-30',
        hora: '12:00',
        salaNumero: 1,
        formato: '2D',
        idioma: 'Castellano',
        precio: 7000,
      }),
    ).toBeUndefined();
    expect(
      (
        await service.guardarAutomatica({
          peliculaId: 2,
          fecha: '2027-02-20',
          hora: '25:00',
          formato: '2D',
          idioma: 'Castellano',
          precio: 7000,
        })
      ).valido,
    ).toBe(false);
  });
});
