import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { afterEach, vi } from 'vitest';
import { Pago } from './pago';
import { Compra } from '../../services/compra';
import { Usuarios } from '../../services/usuarios';
import { CandyBar } from '../../services/candy-bar';
import { Supabase } from '../../services/supabase';
import { crearSupabaseDePrueba, prepararCatalogoDePrueba } from '../../testing/supabase-pruebas';

describe('Pago', () => {
  let component: Pago;
  let fixture: ComponentFixture<Pago>;
  let usuarios: Usuarios;

  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();
    await TestBed.configureTestingModule({
      imports: [Pago],
      providers: [provideRouter([]), { provide: Supabase, useValue: crearSupabaseDePrueba() }],
    }).compileComponents();

    const funcion = await prepararCatalogoDePrueba();
    usuarios = TestBed.inject(Usuarios);
    await usuarios.esperarSesion();
    TestBed.inject(Compra).guardarCompra(funcion, ['A-4']);

    fixture = TestBed.createComponent(Pago);
    component = fixture.componentInstance;

    await fixture.whenStable();
    await vi.waitFor(() => expect(component.cargando()).toBe(false));
    await fixture.whenStable();
  });

  afterEach(() => vi.restoreAllMocks());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('muestra el precio inicial sin escribir ni hacer clic en los campos', () => {
    expect(component.subtotal).toBe(7000);
    expect(component.total).toBe(7000);
    expect(fixture.nativeElement.querySelector('.resumen-pago').textContent).toContain('$7.000');
    expect(component.formularioPago.pristine).toBe(true);
  });

  it('actualiza el descuento visible si la sesión cambia desde otro componente', async () => {
    const registro = await usuarios.registrar(
      'Matias',
      'Prueba',
      'matias@prueba.test',
      '2000-01-01',
      'Prueba123!',
    );
    expect(registro.valido).toBe(true);
    await usuarios.esperarSesion();
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Descuento primera compra');
    expect(component.descuentoPrimeraCompra).toBe(1400);
    expect(component.total).toBe(5600);
    expect(fixture.nativeElement.querySelector('.total-pago').textContent).toContain('$5.600');

    expect(await usuarios.cerrarSesion()).toBe(true);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).not.toContain('Descuento primera compra');
    expect(component.total).toBe(component.subtotal);
    expect(fixture.nativeElement.querySelector('.total-pago').textContent).toContain('$7.000');
    expect(component.formularioPago.pristine).toBe(true);
  });

  it('muestra la compra aprobada y evita procesar el pago dos veces', async () => {
    component.formularioPago.setValue({
      codigoCupon: '',
      nombreTitular: 'Nombre Prueba',
      numeroTarjeta: '4242424242424242',
      vencimiento: '12/99',
      codigoSeguridad: '123',
    });
    await component.procesarPago();
    await fixture.whenStable();
    expect(component.pagoAprobado).toBe(true);
    expect(component.entrada?.codigo).toMatch(/^CINE-/);
    expect(component.entrada?.total).toBe(7000);
    expect(component.total).toBe(7000);
    expect(fixture.nativeElement.textContent).toContain('¡Compra realizada con éxito!');
    expect(TestBed.inject(Compra).getButacasSeleccionadas()).toEqual([]);
    await component.procesarPago();
    expect(TestBed.inject(Supabase).cliente.rpc).toHaveBeenCalledTimes(1);
  });
  it('permite usar todo el crédito sin pedir tarjeta y vuelve a exigirla si se desactiva', async () => {
    await usuarios.iniciarSesion('admin@cine.test', 'Prueba123!');
    const fake = TestBed.inject(Supabase) as unknown as ReturnType<typeof crearSupabaseDePrueba>;
    const cuenta = usuarios.getUsuarioActual()!;
    Object.assign(fake.perfiles.get(cuenta.authId!)!, { credito: 9000 });
    await usuarios.actualizarPerfil();
    component.usarCredito = true;
    component.cambiarCredito();
    await fixture.whenStable();
    expect(component.creditoAplicado).toBe(7000);
    expect(component.totalTarjeta).toBe(0);
    expect(component.formularioPago.valid).toBe(true);
    expect(fixture.nativeElement.querySelector('#numeroTarjeta')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Confirmar compra');
    component.usarCredito = false;
    component.cambiarCredito();
    await fixture.whenStable();
    expect(component.formularioPago.invalid).toBe(true);
    expect(fixture.nativeElement.querySelector('#numeroTarjeta')).not.toBeNull();
  });

  it('limita las entradas gratis y los combos a las butacas distintas disponibles', async () => {
    await usuarios.iniciarSesion('admin@cine.test', 'Prueba123!');
    const fake = TestBed.inject(Supabase) as unknown as ReturnType<typeof crearSupabaseDePrueba>;
    fake.perfiles.get(usuarios.getUsuarioActual()!.authId!)!.puntos = 5000;
    await usuarios.actualizarPerfil();
    component.comboId = component.combos()[0].id;
    component.cantidadCombos = 1;
    component.cambiarCombo();
    component.cantidadesCanje[1] = 3;
    component.cambiarCanjes(1);
    expect(component.cantidadesCanje[1]).toBe(0);
    expect(component.cotizacionValida()).toBe(true);
    component.cantidadCombos = 0;
    component.cambiarCombo();
    component.cantidadesCanje[1] = 3;
    component.cambiarCanjes(1);
    expect(component.cantidadesCanje[1]).toBe(1);
    component.cantidadCombos = 1;
    component.cambiarCombo();
    expect(component.cantidadCombos).toBe(0);
    expect(component.cotizacionValida()).toBe(true);
  });
  it('permite productos con puntos suficientes aunque todas las entradas estén canjeadas', async () => {
    await usuarios.iniciarSesion('admin@cine.test', 'Prueba123!');
    const fake = TestBed.inject(Supabase) as unknown as ReturnType<typeof crearSupabaseDePrueba>;
    fake.perfiles.get(usuarios.getUsuarioActual()!.authId!)!.puntos = 950;
    await usuarios.actualizarPerfil();
    component.cantidadesCanje[1] = 1;
    component.cambiarCanjes(1);
    component.cantidadesCanje[2] = 3;
    component.cambiarCanjes(2);
    expect(component.cantidadesCanje[2]).toBe(3);
    expect(component.puntosUsados).toBe(950);
    expect(component.cotizacionValida()).toBe(true);
    expect(component.total).toBe(0);
  });
  it('no muestra el total anterior como cero si una selección guardada resulta inválida', async () => {
    await usuarios.iniciarSesion('admin@cine.test', 'Prueba123!');
    const fake = TestBed.inject(Supabase) as unknown as ReturnType<typeof crearSupabaseDePrueba>;
    fake.perfiles.get(usuarios.getUsuarioActual()!.authId!)!.puntos = 5000;
    await usuarios.actualizarPerfil();
    component.cantidadesCanje[1] = 99;
    component.cambiarCanjes();
    await fixture.whenStable();
    expect(component.cotizacionValida()).toBe(false);
    expect(fixture.nativeElement.querySelector('.total-pago').textContent).toContain('—');
    expect(fixture.nativeElement.querySelector('.total-pago').textContent).not.toContain('$0');
    expect(fixture.nativeElement.querySelector('#numeroTarjeta')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(true);
  });

  it('muestra el desglose de entrada, pochoclos y bebida y el ahorro del combo', async () => {
    component.funcion!.precio = 9500;
    component.funcion!.precioNormal = 9500;
    component.comboId = component.combos()[0].id;
    component.cantidadCombos = 1;
    component.cambiarCombo();
    await fixture.whenStable();
    const resumen = fixture.nativeElement.querySelector('.resumen-pago').textContent;
    expect(resumen).toContain('Entradas (1)');
    expect(resumen).toContain('$9.500');
    expect(resumen).toContain('Pochoclos grandes');
    expect(resumen).toContain('$4.500');
    expect(resumen).toContain('Gaseosa grande');
    expect(resumen).toContain('$3.000');
    expect(resumen).toContain('Subtotal sin promociones');
    expect(resumen).toContain('$17.000');
    expect(resumen).toContain('Ahorro del combo');
    expect(resumen).toContain('−$5.000');
    expect(component.total).toBe(12000);
  });

  it('cancelar desde Pago vacía toda la compra y el formulario y vuelve a la cartelera', () => {
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const candy = TestBed.inject(CandyBar);
    const compra = TestBed.inject(Compra);
    candy.agregarProducto(1);
    component.comboId = 1;
    component.cantidadCombos = 1;
    component.cambiarCombo();
    compra.guardarCanjes([{ recompensaId: 2, cantidad: 1 }]);
    component.cantidadesCanje = { 2: 1 };
    component.formularioPago.patchValue({
      codigoCupon: 'PRUEBA',
      nombreTitular: 'Ana',
      numeroTarjeta: '1234567812345678',
    });
    component.cancelarCompra();
    expect(confirmar).toHaveBeenCalledOnce();
    expect(compra.getFuncion()).toBeUndefined();
    expect(compra.getButacasSeleccionadas()).toEqual([]);
    expect(compra.getCanjes()).toEqual([]);
    expect(compra.getComboId()).toBeUndefined();
    expect(candy.getCantidadTotal()).toBe(0);
    expect(component.formularioPago.getRawValue()).toEqual({
      codigoCupon: '',
      nombreTitular: '',
      numeroTarjeta: '',
      vencimiento: '',
      codigoSeguridad: '',
    });
    expect(component.cantidadesCanje).toEqual({});
    expect(component.productosCandy).toEqual([]);
    expect(navegar).toHaveBeenCalledWith(['/']);
  });

  it('rechazar la cancelación conserva formulario, productos, butacas y beneficios sin navegar', () => {
    const candy = TestBed.inject(CandyBar);
    const compra = TestBed.inject(Compra);
    candy.agregarProducto(1);
    component.comboId = 1;
    component.cantidadCombos = 1;
    component.cambiarCombo();
    compra.guardarCanjes([{ recompensaId: 2, cantidad: 1 }]);
    component.cantidadesCanje = { 2: 1 };
    component.usarCredito = true;
    component.formularioPago.patchValue({
      codigoCupon: 'PRUEBA',
      nombreTitular: 'Ana Prueba',
      numeroTarjeta: '4242424242424242',
      vencimiento: '12/99',
      codigoSeguridad: '123',
    });
    const formulario = component.formularioPago.getRawValue();
    const pedido = candy.getItemsPedido();
    const borradorCompra = sessionStorage.getItem('cineplus_compra');
    const borradorPedido = sessionStorage.getItem('cineplus_pedido');
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    component.cancelarCompra();

    expect(confirmar).toHaveBeenCalledOnce();
    expect(navegar).not.toHaveBeenCalled();
    expect(compra.getFuncion()?.id).toBe(component.funcion?.id);
    expect(compra.getButacasSeleccionadas()).toEqual(['A-4']);
    expect(compra.getComboId()).toBe(1);
    expect(compra.getCantidadCombos()).toBe(1);
    expect(compra.getCanjes()).toEqual([{ recompensaId: 2, cantidad: 1 }]);
    expect(component.butacasSeleccionadas).toEqual(['A-4']);
    expect(component.comboId).toBe(1);
    expect(component.cantidadCombos).toBe(1);
    expect(component.cantidadesCanje).toEqual({ 2: 1 });
    expect(component.usarCredito).toBe(true);
    expect(component.formularioPago.getRawValue()).toEqual(formulario);
    expect(candy.getItemsPedido()).toEqual(pedido);
    expect(sessionStorage.getItem('cineplus_compra')).toBe(borradorCompra);
    expect(sessionStorage.getItem('cineplus_pedido')).toBe(borradorPedido);
  });

  it('impide cancelar mientras la confirmación de pago está en curso', () => {
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    component.procesando.set(true);
    component.cancelarCompra();
    expect(TestBed.inject(Compra).getButacasSeleccionadas()).toEqual(['A-4']);
    expect(confirmar).not.toHaveBeenCalled();
    expect(navegar).not.toHaveBeenCalled();
  });

  it('completa una tarjeta de prueba válida sin borrar el cupón', () => {
    component.formularioPago.controls.codigoCupon.setValue('PROMO');
    component.usarTarjetaDePrueba();
    expect(component.formularioPago.valid).toBe(true);
    expect(component.formularioPago.controls.numeroTarjeta.value).toBe('4242424242424242');
    expect(component.formularioPago.controls.codigoCupon.value).toBe('PROMO');
  });

  it('formatea el vencimiento sin convertir un mes inválido en una fecha válida', () => {
    component.formularioPago.controls.vencimiento.setValue('1330');
    component.formatearVencimiento();
    expect(component.formularioPago.controls.vencimiento.value).toBe('13/30');
    expect(component.formularioPago.controls.vencimiento.invalid).toBe(true);
  });

  it('impide pagar con un número inválido, tarjeta vencida, titular vacío o código corto', async () => {
    component.usarTarjetaDePrueba();
    component.formularioPago.controls.numeroTarjeta.setValue('4242424242424241');
    await component.procesarPago();
    expect(component.formularioPago.controls.numeroTarjeta.hasError('tarjetaInvalida')).toBe(true);
    component.usarTarjetaDePrueba();
    component.formularioPago.controls.vencimiento.setValue('01/20');
    await component.procesarPago();
    expect(component.formularioPago.controls.vencimiento.hasError('tarjetaVencida')).toBe(true);
    component.usarTarjetaDePrueba();
    component.formularioPago.controls.nombreTitular.setValue('   ');
    await component.procesarPago();
    expect(component.formularioPago.controls.nombreTitular.hasError('titularInvalido')).toBe(true);
    component.usarTarjetaDePrueba();
    component.formularioPago.controls.codigoSeguridad.setValue('12');
    await component.procesarPago();
    expect(component.formularioPago.controls.codigoSeguridad.invalid).toBe(true);
    expect(component.pagoAprobado).toBe(false);
    expect(TestBed.inject(Supabase).cliente.rpc).not.toHaveBeenCalled();
    expect(TestBed.inject(Compra).getButacasSeleccionadas()).toEqual(['A-4']);
  });

  it('identifica la entrada canjeada y la pagada y actualiza puntos usados y restantes en vivo', async () => {
    await usuarios.iniciarSesion('admin@cine.test', 'Prueba123!');
    const fake = TestBed.inject(Supabase) as unknown as ReturnType<typeof crearSupabaseDePrueba>;
    fake.perfiles.get(usuarios.getUsuarioActual()!.authId!)!.puntos = 1000;
    await usuarios.actualizarPerfil();
    component.butacasSeleccionadas = ['A-4', 'A-5'];
    TestBed.inject(Compra).guardarCompra(component.funcion!, component.butacasSeleccionadas);
    component.cantidadesCanje[1] = 1;
    component.cambiarCanjes(1);
    await fixture.whenStable();
    const filas = fixture.nativeElement.querySelectorAll('.entrada-pago');
    expect(filas).toHaveLength(2);
    expect(filas[0].textContent).toContain('Butaca A-4');
    expect(filas[0].textContent).toContain('Canjeada con 500 puntos');
    expect(filas[0].querySelector('.importe-entrada-pago strong').textContent).toBe('$0');
    expect(filas[1].textContent).toContain('Entrada a pagar');
    expect(filas[1].querySelector('.importe-entrada-pago strong').textContent).toBe('$7.000');
    expect(component.puntosUsados).toBe(500);
    expect(component.puntosRestantes).toBe(500);
    component.cantidadesCanje[1] = 2;
    component.cambiarCanjes(1);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelectorAll('.entrada-canjeada')).toHaveLength(2);
    expect(component.puntosUsados).toBe(1000);
    expect(component.puntosRestantes).toBe(0);
    expect(
      fixture.nativeElement.querySelector('.saldo-puntos-pago > div:last-child strong').textContent,
    ).toBe('0');
  });
});
