import { Supabase } from './supabase';
import { crearSupabaseDePrueba, prepararCatalogoDePrueba } from '../testing/supabase-pruebas';
import { TestBed } from '@angular/core/testing';
import { Entradas } from './entradas';

describe('Entradas', () => {
  let service: Entradas;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: Supabase, useValue: crearSupabaseDePrueba() }],
    });
    service = TestBed.inject(Entradas);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
