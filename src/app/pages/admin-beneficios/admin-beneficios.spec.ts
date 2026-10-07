import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { vi } from 'vitest';
import { AdminBeneficios } from './admin-beneficios';
import { Beneficios } from '../../services/beneficios';
import { CandyBar } from '../../services/candy-bar';

describe('Validaciones de combos y recompensas', () => {
  let componente: AdminBeneficios;
  const guardarCombo = vi.fn();
  const guardarRecompensa = vi.fn();
  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: Beneficios,
          useValue: {
            combos: signal([]),
            recompensas: signal([]),
            guardarCombo,
            guardarRecompensa,
          },
        },
        { provide: CandyBar, useValue: { getProductos: () => [] } },
      ],
    });
    componente = TestBed.runInInjectionContext(() => new AdminBeneficios());
  });
  it('explica qué falta y rechaza dos productos iguales sin enviar el combo', async () => {
    await componente.guardarCombo();
    expect(componente.mensaje()).toBe('Ingresá el nombre del combo.');
    componente.formCombo.patchValue({ nombre: 'Combo', precio: 1.5 });
    await componente.guardarCombo();
    expect(componente.mensaje()).toContain('entero');
    componente.formCombo.patchValue({ precio: 100, pochoclosId: 1, bebidaId: 1 });
    await componente.guardarCombo();
    expect(componente.mensaje()).toContain('dos productos distintos');
    expect(guardarCombo).not.toHaveBeenCalled();
  });
  it('requiere un producto en el canje y un costo entero de puntos', async () => {
    componente.formRecompensa.patchValue({ nombre: 'Bebida', tipo: 'producto' });
    await componente.guardarRecompensa();
    expect(componente.mensaje()).toContain('Elegí el producto');
    componente.formRecompensa.patchValue({ productoId: 1, puntos: 1.5 });
    await componente.guardarRecompensa();
    expect(componente.mensaje()).toContain('entero de puntos');
    expect(guardarRecompensa).not.toHaveBeenCalled();
  });
});
