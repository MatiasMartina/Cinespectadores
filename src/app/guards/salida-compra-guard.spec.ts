import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Compra } from '../services/compra';
import { SalidaCompra } from '../services/salida-compra';
import { Supabase } from '../services/supabase';
import { crearSupabaseDePrueba } from '../testing/supabase-pruebas';
import { salidaCompraGuard } from './salida-compra-guard';

@Component({ template: '<p>Compra en curso</p>' })
class CompraDePrueba {
  butacasSeleccionadas = ['A-4'];
}

@Component({ template: '<p>Cartelera</p>' })
class CarteleraDePrueba {}

describe('Guard de salida de la compra con navegación real de Angular', () => {
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: 'funcion/:id/butacas',
            component: CompraDePrueba,
            canDeactivate: [salidaCompraGuard],
          },
          { path: '', component: CarteleraDePrueba },
        ]),
        { provide: Supabase, useValue: crearSupabaseDePrueba() },
      ],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  it('quedarse detiene el router; salir permite ir a la cartelera y elimina la selección', async () => {
    const salida = TestBed.inject(SalidaCompra);
    const harness = await RouterTestingHarness.create();
    const pagina = await harness.navigateByUrl('/funcion/1/butacas', CompraDePrueba);
    salida.registrarPagina(pagina);
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const compra = TestBed.inject(Compra);
    const solicitud = compra.getSolicitud();

    await harness.navigateByUrl('/');
    expect(harness.routeNativeElement?.textContent).toContain('Compra en curso');
    expect(pagina.butacasSeleccionadas).toEqual(['A-4']);
    expect(compra.getSolicitud()).toBe(solicitud);
    expect(confirmar).toHaveBeenCalledOnce();

    confirmar.mockReturnValue(true);
    await harness.navigateByUrl('/', CarteleraDePrueba);
    expect(harness.routeNativeElement?.textContent).toContain('Cartelera');
    expect(pagina.butacasSeleccionadas).toEqual([]);
    expect(compra.getButacasSeleccionadas()).toEqual([]);
    expect(sessionStorage.getItem('cineplus_compra')).toBeNull();
    expect(confirmar).toHaveBeenCalledTimes(2);
  });
});
