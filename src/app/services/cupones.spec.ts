import { Supabase } from './supabase';
import { crearSupabaseDePrueba, prepararCatalogoDePrueba } from '../testing/supabase-pruebas';
import { TestBed } from '@angular/core/testing';
import { Cupones } from './cupones';

describe('Cupones', () => {
  let service: Cupones;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: Supabase, useValue: crearSupabaseDePrueba() }],
    });
    service = TestBed.inject(Cupones);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
