import { Supabase } from './supabase';
import { crearSupabaseDePrueba, prepararCatalogoDePrueba } from '../testing/supabase-pruebas';
import { TestBed } from '@angular/core/testing';
import { Resenas } from './resenas';

describe('Resenas', () => {
  let service: Resenas;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: Supabase, useValue: crearSupabaseDePrueba() }],
    });
    service = TestBed.inject(Resenas);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
  it('explica si falta un puntaje, un comentario o si el comentario es demasiado largo', async () => {
    await expect(service.agregarResena(1, 'Ana', 0, 'Bien')).rejects.toThrow('entre 1 y 5');
    await expect(service.agregarResena(1, 'Ana', 4, '  ')).rejects.toThrow('Escribí un comentario');
    await expect(service.agregarResena(1, 'Ana', 4, 'a'.repeat(301))).rejects.toThrow('300 caracteres');
  });
});
