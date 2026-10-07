import { Supabase } from './supabase';
import { crearSupabaseDePrueba, prepararCatalogoDePrueba } from '../testing/supabase-pruebas';
import { TestBed } from '@angular/core/testing';
import { Butacas } from './butacas';

describe('Butacas', () => {
  let service: Butacas;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [{ provide: Supabase, useValue: crearSupabaseDePrueba() }],
    });
    await prepararCatalogoDePrueba();
    service = TestBed.inject(Butacas);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('calcula el precio de una butaca común y una VIP', () => {
    const comun = service.getButacas().find((butaca) => butaca.tipo === 'Comun');
    const vip = service.getButacas().find((butaca) => butaca.tipo === 'VIP');

    if (!comun || !vip) {
      throw new Error('Falta una butaca común o VIP para la prueba');
    }

    expect(service.getPrecioButaca(8000, comun.id)).toBe(8000);
    expect(service.getPrecioButaca(8000, vip.id)).toBe(10000);
    expect(service.calcularTotal(8000, [comun.id, vip.id])).toBe(18000);
  });
});
