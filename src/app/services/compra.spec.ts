import { Supabase } from './supabase';
import { crearSupabaseDePrueba, prepararCatalogoDePrueba } from '../testing/supabase-pruebas';
import { TestBed } from '@angular/core/testing';
import { Compra } from './compra';
import { Funciones } from './funciones';

describe('Compra', () => {
  let service: Compra;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [{ provide: Supabase, useValue: crearSupabaseDePrueba() }],
    });
    await prepararCatalogoDePrueba();
    service = TestBed.inject(Compra);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('conserva la compra original hasta confirmar la función nueva', () => {
    const funcionOriginal = TestBed.inject(Funciones).getFuncionesPorPeliculaId(1)[0];

    if (!funcionOriginal) {
      throw new Error('Falta una función para la prueba');
    }

    const funcionNueva = {
      ...funcionOriginal,
      id: funcionOriginal.id + 1000,
    };

    service.guardarCompra(funcionOriginal, ['A-1']);
    service.guardarFuncionPendiente(funcionNueva);

    expect(service.getFuncion()?.id).toBe(funcionOriginal.id);
    expect(service.getButacasSeleccionadas()).toEqual(['A-1']);
    expect(service.getFuncionPendiente()?.id).toBe(funcionNueva.id);

    service.guardarCompra(funcionNueva, ['B-2']);

    expect(service.getFuncion()?.id).toBe(funcionNueva.id);
    expect(service.getButacasSeleccionadas()).toEqual(['B-2']);
    expect(service.getFuncionPendiente()).toBeUndefined();
  });
});
