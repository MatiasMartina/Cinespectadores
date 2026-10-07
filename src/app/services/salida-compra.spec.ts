import { TestBed } from '@angular/core/testing';
import {
  NavigationCancel,
  NavigationCancellationCode,
  NavigationEnd,
  NavigationError,
  provideRouter,
  Router,
} from '@angular/router';
import { Subject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { Funcion } from '../models/funcion';
import { crearSupabaseDePrueba } from '../testing/supabase-pruebas';
import { CandyBar } from './candy-bar';
import { Compra } from './compra';
import { PaginaCompra, SalidaCompra } from './salida-compra';
import { Supabase } from './supabase';

const funcion: Funcion = {
  id: 1,
  peliculaId: 1,
  fecha: '2030-01-01',
  hora: '18:00',
  salaNumero: 1,
  formato: '2D',
  idioma: 'Castellano',
  precio: 8000,
};

describe('Salida de una compra sin finalizar', () => {
  let salida: SalidaCompra;
  let compra: Compra;
  let candy: CandyBar;
  let eventos: Subject<NavigationEnd | NavigationCancel | NavigationError>;
  let confirmar: MockInstance<typeof window.confirm>;

  beforeEach(async () => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: Supabase, useValue: crearSupabaseDePrueba() }],
    });
    eventos = new Subject();
    vi.spyOn(TestBed.inject(Router), 'events', 'get').mockReturnValue(eventos.asObservable());
    compra = TestBed.inject(Compra);
    candy = TestBed.inject(CandyBar);
    await candy.cargar();
    salida = TestBed.inject(SalidaCompra);
    confirmar = vi.spyOn(window, 'confirm').mockReturnValue(false);
  });

  afterEach(() => {
    eventos.complete();
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  function prepararBorrador(): void {
    compra.guardarCompra(funcion, ['A-4']);
    compra.guardarFuncionPendiente({ ...funcion, id: 2 });
    compra.guardarFechaNacimientoInvitado('1990-01-01');
    compra.guardarCombo(1, 1);
    compra.guardarCanjes([{ recompensaId: 2, cantidad: 1 }]);
    candy.agregarProducto(1);
    candy.iniciarEdicion();
    candy.agregarProducto(2);
  }

  function estadoBorrador() {
    return {
      funcion: compra.getFuncion(),
      butacas: compra.getButacasSeleccionadas(),
      pendiente: compra.getFuncionPendiente(),
      nacimiento: compra.getFechaNacimientoInvitado(),
      combo: compra.getComboId(),
      cantidadCombos: compra.getCantidadCombos(),
      canjes: compra.getCanjes(),
      solicitud: compra.getSolicitud(),
      productos: candy.getItemsPedido(),
      compraGuardada: sessionStorage.getItem('cineplus_compra'),
      pedidoGuardado: sessionStorage.getItem('cineplus_pedido'),
    };
  }

  function esperarBorradorVacio(): void {
    expect(compra.getFuncion()).toBeUndefined();
    expect(compra.getButacasSeleccionadas()).toEqual([]);
    expect(compra.getFuncionPendiente()).toBeUndefined();
    expect(compra.getFechaNacimientoInvitado()).toBeUndefined();
    expect(compra.getComboId()).toBeUndefined();
    expect(compra.getCantidadCombos()).toBe(0);
    expect(compra.getCanjes()).toEqual([]);
    expect(candy.getItemsPedido()).toEqual([]);
    expect(sessionStorage.getItem('cineplus_compra')).toBeNull();
    expect(sessionStorage.getItem('cineplus_pedido')).toBe('{}');
    candy.cancelarEdicion();
    expect(candy.getItemsPedido()).toEqual([]);
  }

  it('detecta un asiento elegido antes de que se guarde en el servicio de compra', () => {
    const pagina: PaginaCompra = { funcion, butacasSeleccionadas: ['A-4'] };
    salida.registrarPagina(pagina);
    expect(compra.getButacasSeleccionadas()).toEqual([]);
    expect(salida.hayCambios()).toBe(true);
    expect(salida.permitirSalida('/', pagina, '/funcion/1/butacas')).toBe(false);
    expect(pagina.butacasSeleccionadas).toEqual(['A-4']);
    expect(confirmar).toHaveBeenCalledOnce();
  });

  it('quedarse conserva todos los datos y el borrador guardado', () => {
    prepararBorrador();
    const anterior = estadoBorrador();
    expect(salida.permitirSalida('/proximamente', undefined, '/pago')).toBe(false);
    expect(estadoBorrador()).toEqual(anterior);
    expect(confirmar).toHaveBeenCalledOnce();
    expect(confirmar.mock.calls[0][0]).toContain('se perderán');
  });

  it('aceptar limpia todos los datos recién cuando termina la navegación', () => {
    prepararBorrador();
    const pagina: PaginaCompra = { funcion, butacasSeleccionadas: ['A-4'] };
    salida.registrarPagina(pagina);
    const anterior = estadoBorrador();
    confirmar.mockReturnValue(true);
    expect(salida.permitirSalida('/', pagina, '/confirmacion')).toBe(true);
    expect(estadoBorrador()).toEqual(anterior);
    expect(pagina.butacasSeleccionadas).toEqual(['A-4']);
    eventos.next(new NavigationEnd(2, '/', '/'));
    esperarBorradorVacio();
    expect(pagina.butacasSeleccionadas).toEqual([]);
  });

  it.each([
    new NavigationCancel(
      2,
      '/perfil',
      'Acceso rechazado',
      NavigationCancellationCode.GuardRejected,
    ),
    new NavigationError(2, '/perfil', new Error('Falló la navegación')),
  ])(
    'una navegación fallida conserva el borrador y requiere confirmar el siguiente intento',
    (evento) => {
      prepararBorrador();
      const anterior = estadoBorrador();
      confirmar.mockReturnValue(true);
      expect(salida.permitirSalida('/perfil', undefined, '/pago')).toBe(true);
      eventos.next(evento);
      expect(estadoBorrador()).toEqual(anterior);
      confirmar.mockReturnValue(false);
      expect(salida.permitirSalida('/proximamente', undefined, '/pago')).toBe(false);
      expect(confirmar).toHaveBeenCalledTimes(2);
      expect(estadoBorrador()).toEqual(anterior);
    },
  );

  it('mantiene una única confirmación cuando el destino redirige', () => {
    prepararBorrador();
    confirmar.mockReturnValue(true);
    expect(salida.permitirSalida('/perfil', undefined, '/pago')).toBe(true);
    eventos.next(
      new NavigationCancel(2, '/perfil', 'Redirección', NavigationCancellationCode.Redirect),
    );
    expect(salida.permitirSalida('/inicio-sesion?returnUrl=%2Fperfil', undefined, '/pago')).toBe(
      true,
    );
    expect(confirmar).toHaveBeenCalledOnce();
    expect(compra.getButacasSeleccionadas()).toEqual(['A-4']);
    eventos.next(
      new NavigationEnd(
        3,
        '/inicio-sesion?returnUrl=%2Fperfil',
        '/inicio-sesion?returnUrl=%2Fperfil',
      ),
    );
    esperarBorradorVacio();
  });

  it.each(['/candy-bar', '/confirmacion', '/pago'])(
    'continuar a %s conserva las butacas confirmadas',
    (destino) => {
      compra.guardarCompra(funcion, ['A-4']);
      candy.agregarProducto(1);
      const pagina: PaginaCompra = { funcion, butacasSeleccionadas: ['A-4'] };
      const anterior = estadoBorrador();
      expect(salida.permitirSalida(destino, pagina, '/funcion/1/butacas')).toBe(true);
      eventos.next(new NavigationEnd(2, destino, destino));
      expect(confirmar).not.toHaveBeenCalled();
      expect(estadoBorrador()).toEqual(anterior);
    },
  );

  it('ir al Candy desde el navbar no pierde silenciosamente una selección de butacas nueva', () => {
    const pagina: PaginaCompra = { funcion, butacasSeleccionadas: ['A-4'] };
    expect(salida.permitirSalida('/candy-bar', pagina, '/funcion/1/butacas')).toBe(false);
    expect(confirmar).toHaveBeenCalledOnce();
    expect(pagina.butacasSeleccionadas).toEqual(['A-4']);
  });

  it('detecta productos del pedido aunque ya no estén disponibles en el catálogo', () => {
    candy.agregarProducto(1);
    vi.spyOn(candy, 'getProductos').mockReturnValue([]);
    expect(candy.getCantidadTotal()).toBe(0);
    expect(salida.hayCambios()).toBe(true);
    expect(salida.permitirSalida('/', undefined, '/candy-bar')).toBe(false);
  });

  it('no considera Confirmación una continuación válida de una compra de Candy sin función', () => {
    candy.agregarProducto(1);
    expect(salida.permitirSalida('/confirmacion', undefined, '/candy-bar')).toBe(false);
    expect(confirmar).toHaveBeenCalledOnce();
    expect(candy.getCantidadTotal()).toBe(1);
  });

  it('permite editar la función y elegir las butacas de la función pendiente', () => {
    compra.guardarCompra(funcion, ['A-4']);
    expect(salida.permitirSalida('/pelicula/1?editar=true', undefined, '/confirmacion')).toBe(true);
    compra.guardarFuncionPendiente({ ...funcion, id: 2 });
    expect(
      salida.permitirSalida(
        '/funcion/2/butacas?editar=true',
        { modoEdicion: true },
        '/pelicula/1?editar=true',
      ),
    ).toBe(true);
    expect(confirmar).not.toHaveBeenCalled();
    expect(compra.getFuncion()?.id).toBe(1);
    expect(compra.getButacasSeleccionadas()).toEqual(['A-4']);
  });

  it('volver de editar butacas conserva la selección original confirmada', () => {
    compra.guardarCompra(funcion, ['A-4']);
    const pagina: PaginaCompra = { funcion, modoEdicion: true, butacasSeleccionadas: ['B-2'] };
    expect(salida.permitirSalida('/confirmacion', pagina, '/funcion/1/butacas?editar=true')).toBe(
      true,
    );
    expect(confirmar).not.toHaveBeenCalled();
    expect(compra.getButacasSeleccionadas()).toEqual(['A-4']);
  });

  it.each([
    ['/pago', '/inicio-sesion?returnUrl=%2Fpago'],
    ['/inicio-sesion?returnUrl=%2Fpago', '/registro?returnUrl=%2Fpago'],
    ['/registro?returnUrl=%2Fpago', '/inicio-sesion?returnUrl=%2Fpago'],
    ['/inicio-sesion?returnUrl=%2Fpago', '/pago'],
  ])('conserva la compra durante la autenticación: %s → %s', (origen, destino) => {
    compra.guardarCompra(funcion, ['A-4']);
    const anterior = estadoBorrador();
    expect(salida.permitirSalida(destino, undefined, origen)).toBe(true);
    eventos.next(new NavigationEnd(2, destino, destino));
    expect(confirmar).not.toHaveBeenCalled();
    expect(estadoBorrador()).toEqual(anterior);
  });

  it.each(['/inicio-sesion?returnUrl=%2Fperfil', '/pelicula/2?editar=true', '/funcion/3/butacas'])(
    'salir a %s no se considera parte de la compra actual',
    (destino) => {
      compra.guardarCompra(funcion, ['A-4']);
      expect(salida.permitirSalida(destino, undefined, '/confirmacion')).toBe(false);
      expect(confirmar).toHaveBeenCalledOnce();
      expect(compra.getButacasSeleccionadas()).toEqual(['A-4']);
    },
  );

  it('permite salir sin avisar cuando no se eligió nada o el pago ya fue aprobado', () => {
    expect(salida.permitirSalida('/', undefined, '/candy-bar')).toBe(true);
    const pagina: PaginaCompra = { funcion, pagoAprobado: true, butacasSeleccionadas: ['A-4'] };
    expect(salida.hayCambios(pagina)).toBe(false);
    expect(salida.permitirSalida('/perfil', pagina, '/pago')).toBe(true);
    expect(confirmar).not.toHaveBeenCalled();
    expect(pagina.butacasSeleccionadas).toEqual(['A-4']);
  });

  it('impide salir o cancelar mientras se está procesando el pago', () => {
    prepararBorrador();
    const pagina: PaginaCompra = {
      funcion,
      butacasSeleccionadas: ['A-4'],
      pagoAprobado: false,
      procesando: () => true,
    };
    const anterior = estadoBorrador();
    expect(salida.permitirSalida('/', pagina, '/pago')).toBe(false);
    expect(salida.cancelarCompra(pagina)).toBe(false);
    expect(confirmar).not.toHaveBeenCalled();
    expect(estadoBorrador()).toEqual(anterior);
  });

  it('cancelar explícitamente también permite quedarse y después descartar todo', () => {
    prepararBorrador();
    const pagina: PaginaCompra = { funcion, butacasSeleccionadas: ['A-4'] };
    const anterior = estadoBorrador();
    expect(salida.cancelarCompra(pagina)).toBe(false);
    expect(estadoBorrador()).toEqual(anterior);
    confirmar.mockReturnValue(true);
    expect(salida.cancelarCompra(pagina)).toBe(true);
    esperarBorradorVacio();
    expect(pagina.butacasSeleccionadas).toEqual([]);
  });

  it('el botón de cancelar pide confirmación incluso si el carrito está vacío', () => {
    expect(salida.cancelarCompra()).toBe(false);
    expect(confirmar).toHaveBeenCalledOnce();
    expect(confirmar.mock.calls[0][0]).toContain('cancelar la compra');
  });

  it('el aviso de cierre o recarga conserva la compra si el usuario decide quedarse', () => {
    prepararBorrador();
    salida.registrarPagina({ funcion, butacasSeleccionadas: ['A-4'] });
    const anterior = estadoBorrador();
    const evento = new Event('beforeunload', { cancelable: true }) as BeforeUnloadEvent;
    salida.avisarAntesDeSalir(evento);
    expect(evento.defaultPrevented).toBe(true);
    expect(estadoBorrador()).toEqual(anterior);
    expect(confirmar).not.toHaveBeenCalled();
  });

  it('descarta al salir del documento y no durante una operación de pago', () => {
    prepararBorrador();
    const pagina: PaginaCompra = {
      funcion,
      butacasSeleccionadas: ['A-4'],
      pagoAprobado: false,
      procesando: () => true,
    };
    salida.registrarPagina(pagina);
    const anterior = estadoBorrador();
    salida.descartarAlSalirDelDocumento();
    expect(estadoBorrador()).toEqual(anterior);
    pagina.procesando = () => false;
    salida.descartarAlSalirDelDocumento();
    esperarBorradorVacio();
    expect(pagina.butacasSeleccionadas).toEqual([]);
  });

  it('abrir la app fuera del flujo elimina los borradores anteriores sin preguntar', () => {
    prepararBorrador();
    eventos.next(new NavigationEnd(1, '/', '/'));
    esperarBorradorVacio();
    expect(confirmar).not.toHaveBeenCalled();
  });
});
