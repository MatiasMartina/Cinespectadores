import { Supabase } from '../../services/supabase';
import { crearSupabaseDePrueba } from '../../testing/supabase-pruebas';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Navbar } from './navbar';
import { provideRouter, Router } from '@angular/router';
import { Usuario } from '../../models/usuario';
import { CandyBar } from '../../services/candy-bar';
import { Compra } from '../../services/compra';
import { afterEach, vi } from 'vitest';

describe('Navbar', () => {
  let component: Navbar;
  let fixture: ComponentFixture<Navbar>;
  let supabaseDePrueba: ReturnType<typeof crearSupabaseDePrueba>;
  const usuario: Usuario = {
    id: 1,
    authId: 'cuenta-de-prueba',
    nombre: 'Matías',
    apellido: 'Prueba',
    email: 'cuenta@cine.test',
    fechaNacimiento: '1997-01-01',
    rol: 'cliente',
  };

  beforeEach(async () => {
    sessionStorage.clear();
    supabaseDePrueba = crearSupabaseDePrueba();
    await TestBed.configureTestingModule({
      imports: [Navbar],
      providers: [
        provideRouter([
          { path: '', children: [] },
          { path: 'perfil', children: [] },
          { path: 'mis-peliculas', children: [] },
        ]),
        { provide: Supabase, useValue: supabaseDePrueba },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Navbar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  afterEach(() => vi.restoreAllMocks());

  async function prepararBorrador(): Promise<void> {
    const compra = TestBed.inject(Compra);
    const candy = TestBed.inject(CandyBar);
    await candy.cargar();
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
    candy.agregarProducto(1);
    component.usuarioActual.set(usuario);
    await fixture.whenStable();
  }

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('ofrece los accesos de cuenta desde el saludo para todos los roles, pero no para invitados', async () => {
    const raiz = fixture.nativeElement as HTMLElement;
    expect(raiz.querySelector('.boton-usuario')).toBeNull();
    expect(raiz.querySelector('.opciones-usuario')).toBeNull();

    for (const rol of ['cliente', 'admin', 'empleado'] as const) {
      component.usuarioActual.set({ ...usuario, rol });
      await fixture.whenStable();
      const boton = raiz.querySelector<HTMLButtonElement>('.boton-usuario')!;
      expect(boton.getAttribute('aria-expanded')).toBe('false');
      boton.click();
      await fixture.whenStable();

      expect(boton.getAttribute('aria-expanded')).toBe('true');
      const panel = raiz.querySelector<HTMLElement>('.opciones-usuario')!;
      expect(panel.id).toBe(boton.getAttribute('aria-controls'));
      expect([...panel.querySelectorAll('a')].map((enlace) => enlace.getAttribute('href'))).toEqual(
        ['/perfil', '/mis-peliculas'],
      );
      expect(raiz.querySelector('.enlaces a[href="/perfil"]')).toBeNull();
      expect(raiz.querySelector('.enlaces a[href="/mis-peliculas"]')).toBeNull();

      boton.click();
      await fixture.whenStable();
      expect(raiz.querySelector('.opciones-usuario')).toBeNull();
    }
  });

  it('cierra el desplegable al salir y con Escape devuelve el foco al saludo', async () => {
    component.usuarioActual.set(usuario);
    await fixture.whenStable();
    const raiz = fixture.nativeElement as HTMLElement;
    const boton = raiz.querySelector<HTMLButtonElement>('.boton-usuario')!;

    boton.click();
    await fixture.whenStable();
    raiz
      .querySelector('.opciones-usuario')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await fixture.whenStable();
    expect(component.menuUsuarioAbierto()).toBe(true);

    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await fixture.whenStable();
    expect(raiz.querySelector('.opciones-usuario')).toBeNull();

    boton.click();
    await fixture.whenStable();
    raiz.querySelector<HTMLAnchorElement>('.opciones-usuario a')!.focus();
    await fixture.whenStable();
    expect(component.menuUsuarioAbierto()).toBe(true);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await fixture.whenStable();
    expect(raiz.querySelector('.opciones-usuario')).toBeNull();
    expect(document.activeElement).toBe(boton);

    const botonExterior = document.createElement('button');
    document.body.append(botonExterior);
    try {
      boton.click();
      await fixture.whenStable();
      raiz.querySelector<HTMLAnchorElement>('.opciones-usuario a')!.focus();
      botonExterior.focus();
      await fixture.whenStable();
      expect(raiz.querySelector('.opciones-usuario')).toBeNull();
      expect(document.activeElement).toBe(botonExterior);
    } finally {
      botonExterior.remove();
    }
  });

  it('navega a los destinos de cuenta y cerrar sesión elimina el menú y vuelve a Cartelera', async () => {
    component.usuarioActual.set({ ...usuario, rol: 'admin' });
    await fixture.whenStable();
    const raiz = fixture.nativeElement as HTMLElement;
    const boton = raiz.querySelector<HTMLButtonElement>('.boton-usuario')!;
    const router = TestBed.inject(Router);

    for (const destino of ['/perfil', '/mis-peliculas']) {
      boton.click();
      await fixture.whenStable();
      raiz.querySelector<HTMLAnchorElement>(`.opciones-usuario a[href="${destino}"]`)!.click();
      await fixture.whenStable();
      expect(router.url).toBe(destino);
      expect(raiz.querySelector('.opciones-usuario')).toBeNull();
    }

    boton.click();
    await fixture.whenStable();
    raiz.querySelector<HTMLButtonElement>('.opciones-usuario .cerrar-sesion')!.click();
    await fixture.whenStable();
    expect(supabaseDePrueba.cliente.auth.signOut).toHaveBeenCalledOnce();
    expect(component.usuarioActual()).toBeUndefined();
    expect(component.menuUsuarioAbierto()).toBe(false);
    expect(raiz.querySelector('.boton-usuario')).toBeNull();
    expect(raiz.querySelector('.opciones-usuario')).toBeNull();
    expect(router.url).toBe('/');
  });

  it('rechazar el abandono evita cerrar sesión y conserva el usuario y todo el borrador', async () => {
    await prepararBorrador();
    const compra = TestBed.inject(Compra);
    const candy = TestBed.inject(CandyBar);
    const pedido = candy.getItemsPedido();
    const borradorCompra = sessionStorage.getItem('cineplus_compra');
    const borradorPedido = sessionStorage.getItem('cineplus_pedido');
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    await component.cerrarSesion();

    expect(confirmar).toHaveBeenCalledOnce();
    expect(supabaseDePrueba.cliente.auth.signOut).not.toHaveBeenCalled();
    expect(navegar).not.toHaveBeenCalled();
    expect(component.usuarioActual()).toEqual(usuario);
    expect(compra.getButacasSeleccionadas()).toEqual(['A-4']);
    expect(compra.getComboId()).toBe(1);
    expect(compra.getCanjes()).toEqual([{ recompensaId: 2, cantidad: 1 }]);
    expect(candy.getItemsPedido()).toEqual(pedido);
    expect(sessionStorage.getItem('cineplus_compra')).toBe(borradorCompra);
    expect(sessionStorage.getItem('cineplus_pedido')).toBe(borradorPedido);
  });

  it('un fallo al cerrar sesión conserva el borrador y la cuenta aunque se acepte salir', async () => {
    await prepararBorrador();
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const avisar = vi.spyOn(window, 'alert').mockImplementation(() => undefined);
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    supabaseDePrueba.cliente.auth.signOut.mockRejectedValueOnce(new Error('Sin conexión'));
    const borradorCompra = sessionStorage.getItem('cineplus_compra');
    const borradorPedido = sessionStorage.getItem('cineplus_pedido');

    await component.cerrarSesion();

    expect(confirmar).toHaveBeenCalledOnce();
    expect(supabaseDePrueba.cliente.auth.signOut).toHaveBeenCalledOnce();
    expect(avisar).toHaveBeenCalledOnce();
    expect(navegar).not.toHaveBeenCalled();
    expect(component.usuarioActual()).toEqual(usuario);
    expect(TestBed.inject(Compra).getButacasSeleccionadas()).toEqual(['A-4']);
    expect(TestBed.inject(CandyBar).getCantidadTotal()).toBe(1);
    expect(sessionStorage.getItem('cineplus_compra')).toBe(borradorCompra);
    expect(sessionStorage.getItem('cineplus_pedido')).toBe(borradorPedido);
  });

  it('descarta el borrador y vuelve a Cartelera únicamente después de cerrar sesión con éxito', async () => {
    await prepararBorrador();
    const compra = TestBed.inject(Compra);
    const candy = TestBed.inject(CandyBar);
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    let completarCierre!: () => void;
    supabaseDePrueba.cliente.auth.signOut.mockImplementationOnce(
      () => new Promise((resolve) => (completarCierre = () => resolve({ error: null }))),
    );
    const borradorCompra = sessionStorage.getItem('cineplus_compra');
    const borradorPedido = sessionStorage.getItem('cineplus_pedido');

    const cierre = component.cerrarSesion();
    expect(confirmar).toHaveBeenCalledOnce();
    expect(supabaseDePrueba.cliente.auth.signOut).toHaveBeenCalledOnce();
    expect(component.usuarioActual()).toEqual(usuario);
    expect(sessionStorage.getItem('cineplus_compra')).toBe(borradorCompra);
    expect(sessionStorage.getItem('cineplus_pedido')).toBe(borradorPedido);
    expect(navegar).not.toHaveBeenCalled();

    completarCierre();
    await cierre;
    await fixture.whenStable();
    expect(component.usuarioActual()).toBeUndefined();
    expect(compra.getFuncion()).toBeUndefined();
    expect(compra.getButacasSeleccionadas()).toEqual([]);
    expect(compra.getComboId()).toBeUndefined();
    expect(compra.getCantidadCombos()).toBe(0);
    expect(compra.getCanjes()).toEqual([]);
    expect(candy.getCantidadTotal()).toBe(0);
    expect(sessionStorage.getItem('cineplus_compra')).toBeNull();
    expect(sessionStorage.getItem('cineplus_pedido')).toBe('{}');
    expect(navegar).toHaveBeenCalledExactlyOnceWith(['/']);
  });
});
