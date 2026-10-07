import { Supabase } from '../../services/supabase';
import { crearSupabaseDePrueba } from '../../testing/supabase-pruebas';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CandyBarPage } from './candy-bar';
import { provideRouter, Router } from '@angular/router';
import { afterEach, vi } from 'vitest';
import { CandyBar } from '../../services/candy-bar';
import { Compra } from '../../services/compra';

describe('CandyBarPage', () => {
  let component: CandyBarPage;
  let fixture: ComponentFixture<CandyBarPage>;

  beforeEach(async () => {
    sessionStorage.clear();
    await TestBed.configureTestingModule({
      imports: [CandyBarPage],
      providers: [provideRouter([]), { provide: Supabase, useValue: crearSupabaseDePrueba() }],
    }).compileComponents();

    fixture = TestBed.createComponent(CandyBarPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  afterEach(() => vi.restoreAllMocks());

  function prepararCompra(): void {
    const compra = TestBed.inject(Compra);
    compra.guardarCompra(
      {
        id: 99,
        peliculaId: 1,
        fecha: '2030-01-01',
        hora: '18:00',
        salaNumero: 1,
        formato: '2D',
        idioma: 'Castellano',
        precio: 8000,
      },
      ['A-4'],
    );
    compra.guardarCombo(1, 1);
    compra.guardarCanjes([{ recompensaId: 2, cantidad: 1 }]);
    TestBed.inject(CandyBar).agregarProducto(1);
  }

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('sin función no ofrece una continuación que descarte el carrito', async () => {
    TestBed.inject(CandyBar).agregarProducto(1);
    await fixture.whenStable();
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const continuar: HTMLButtonElement = fixture.nativeElement.querySelector('.boton-continuar');
    expect(continuar.disabled).toBe(true);
    continuar.click();
    expect(confirmar).not.toHaveBeenCalled();
    expect(TestBed.inject(CandyBar).getCantidadTotal()).toBe(1);
  });

  it('vacía el Candy y su borrador, conserva entradas y beneficios y permanece en la página', async () => {
    prepararCompra();
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const borrador = sessionStorage.getItem('cineplus_compra');
    fixture.detectChanges();
    fixture.nativeElement.querySelector('.boton-vaciar').click();
    await fixture.whenStable();
    expect(component.getCantidadTotal()).toBe(0);
    expect(component.getTotal()).toBe(0);
    expect(sessionStorage.getItem('cineplus_pedido')).toBe('{}');
    expect(sessionStorage.getItem('cineplus_compra')).toBe(borrador);
    expect(TestBed.inject(Compra).getButacasSeleccionadas()).toEqual(['A-4']);
    expect(TestBed.inject(Compra).getComboId()).toBe(1);
    expect(TestBed.inject(Compra).getCanjes()).toEqual([{ recompensaId: 2, cantidad: 1 }]);
    expect(fixture.nativeElement.querySelector('.pedido-total').textContent).toContain('$0');
    expect(fixture.nativeElement.querySelector('.boton-vaciar').disabled).toBe(true);
    expect(navegar).not.toHaveBeenCalled();
  });

  it('vaciar durante una edición impide restaurar los productos anteriores al volver', () => {
    prepararCompra();
    const candy = TestBed.inject(CandyBar);
    candy.iniciarEdicion();
    component.modoEdicion = true;
    candy.agregarProducto(2);
    component.vaciarCarrito();
    component.descartarCambios();
    expect(candy.getCantidadTotal()).toBe(0);
    expect(candy.getCantidadOriginal(1)).toBe(0);
    expect(TestBed.inject(Compra).getFuncion()?.id).toBe(99);
  });

  it('cancelar limpia todo el borrador y vuelve a la cartelera', () => {
    prepararCompra();
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const compra = TestBed.inject(Compra);
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    component.cancelarCompra();
    expect(confirmar).toHaveBeenCalledOnce();
    expect(compra.getFuncion()).toBeUndefined();
    expect(compra.getButacasSeleccionadas()).toEqual([]);
    expect(compra.getComboId()).toBeUndefined();
    expect(compra.getCantidadCombos()).toBe(0);
    expect(compra.getCanjes()).toEqual([]);
    expect(TestBed.inject(CandyBar).getCantidadTotal()).toBe(0);
    expect(sessionStorage.getItem('cineplus_compra')).toBeNull();
    expect(sessionStorage.getItem('cineplus_pedido')).toBe('{}');
    expect(navegar).toHaveBeenCalledWith(['/']);
  });

  it('rechazar la cancelación conserva el pedido editado, las entradas y los beneficios sin salir', () => {
    prepararCompra();
    const compra = TestBed.inject(Compra);
    const candy = TestBed.inject(CandyBar);
    candy.iniciarEdicion();
    component.modoEdicion = true;
    candy.agregarProducto(2);
    const pedido = candy.getItemsPedido();
    const borradorCompra = sessionStorage.getItem('cineplus_compra');
    const borradorPedido = sessionStorage.getItem('cineplus_pedido');
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    component.cancelarCompra();

    expect(confirmar).toHaveBeenCalledOnce();
    expect(navegar).not.toHaveBeenCalled();
    expect(compra.getFuncion()?.id).toBe(99);
    expect(compra.getButacasSeleccionadas()).toEqual(['A-4']);
    expect(compra.getComboId()).toBe(1);
    expect(compra.getCantidadCombos()).toBe(1);
    expect(compra.getCanjes()).toEqual([{ recompensaId: 2, cantidad: 1 }]);
    expect(candy.getItemsPedido()).toEqual(pedido);
    expect(candy.getCantidadOriginal(1)).toBe(1);
    expect(sessionStorage.getItem('cineplus_compra')).toBe(borradorCompra);
    expect(sessionStorage.getItem('cineplus_pedido')).toBe(borradorPedido);
  });
});
