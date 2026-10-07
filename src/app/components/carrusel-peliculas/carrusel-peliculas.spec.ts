import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Pelicula } from '../../models/pelicula';
import { CarruselPeliculas } from './carrusel-peliculas';

describe('CarruselPeliculas', () => {
  let fixture: ComponentFixture<CarruselPeliculas> | undefined;
  let component: CarruselPeliculas;
  let medios: MediaQueryList;
  let movimientoReducido: boolean;
  let pestanaOculta: boolean;
  const matchMediaOriginal = Object.getOwnPropertyDescriptor(window, 'matchMedia');
  const ranking: Pelicula[] = [
    {
      id: 47,
      nombre: 'Primera del ranking',
      sinopsis: 'La más vendida.',
      duracionMinutos: 110,
      imagenUrl: '/primera.jpg',
      generos: ['Drama'],
      edadMinima: 13,
      cantidadVendida: 200,
    },
    {
      id: 9,
      nombre: 'Segunda del ranking',
      sinopsis: 'La segunda más vendida.',
      duracionMinutos: 95,
      imagenUrl: '/segunda.jpg',
      generos: ['Comedia'],
      edadMinima: 0,
      cantidadVendida: 150,
    },
    {
      id: 82,
      nombre: 'Tercera del ranking',
      sinopsis: 'La tercera más vendida.',
      duracionMinutos: 120,
      imagenUrl: '/tercera.jpg',
      generos: ['Acción'],
      edadMinima: 16,
      cantidadVendida: 90,
    },
  ];

  beforeEach(async () => {
    movimientoReducido = false;
    pestanaOculta = false;
    medios = new EventTarget() as MediaQueryList;
    Object.defineProperties(medios, {
      matches: { get: () => movimientoReducido },
      media: { value: '(prefers-reduced-motion: reduce)' },
    });
    medios.onchange = null;
    medios.addListener = vi.fn();
    medios.removeListener = vi.fn();
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn(() => medios),
    });
    vi.spyOn(document, 'hidden', 'get').mockImplementation(() => pestanaOculta);
    // Los timeouts del scheduler de Angular siguen siendo reales.
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    await TestBed.configureTestingModule({
      imports: [CarruselPeliculas],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  afterEach(() => {
    fixture?.destroy();
    fixture = undefined;
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
    if (matchMediaOriginal) Object.defineProperty(window, 'matchMedia', matchMediaOriginal);
    else Reflect.deleteProperty(window, 'matchMedia');
  });

  async function iniciar(peliculas: Pelicula[] = ranking): Promise<HTMLElement> {
    fixture = TestBed.createComponent(CarruselPeliculas);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('peliculas', peliculas);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  async function avanzar(milisegundos: number): Promise<void> {
    vi.advanceTimersByTime(milisegundos);
    await fixture!.whenStable();
  }

  it('rota cada cinco segundos sin duplicar intervalos y conserva el ranking y el destino de entradas', async () => {
    const raiz = await iniciar();
    expect(vi.getTimerCount()).toBe(1);
    expect(raiz.querySelector('h3')?.textContent).toContain(ranking[0].nombre);
    expect(raiz.textContent).toMatch(/Top\s*1/i);
    expect(raiz.querySelector('.boton-entradas')?.getAttribute('href')).toBe('/pelicula/47');

    await avanzar(4999);
    expect(component.indiceActual()).toBe(0);
    await avanzar(1);
    expect(component.peliculaActiva()?.id).toBe(9);
    expect(raiz.querySelector('h3')?.textContent).toContain(ranking[1].nombre);
    expect(raiz.textContent).toMatch(/Top\s*2/i);
    expect(raiz.querySelector('.boton-entradas')?.getAttribute('href')).toBe('/pelicula/9');

    await avanzar(5000);
    expect(component.peliculaActiva()?.id).toBe(82);
    expect(raiz.textContent).toMatch(/Top\s*3/i);
    expect(raiz.querySelector('.boton-entradas')?.getAttribute('href')).toBe('/pelicula/82');
    await avanzar(5000);
    expect(component.peliculaActiva()?.id).toBe(47);
    expect(vi.getTimerCount()).toBe(1);
  });

  it('permite recorrer los extremos y elegir una película con su indicador', async () => {
    const raiz = await iniciar();
    raiz.querySelector<HTMLButtonElement>('.flecha-anterior')!.click();
    await fixture!.whenStable();
    expect(component.peliculaActiva()?.id).toBe(82);
    raiz.querySelector<HTMLButtonElement>('.flecha-siguiente')!.click();
    await fixture!.whenStable();
    expect(component.peliculaActiva()?.id).toBe(47);

    const indicadores = raiz.querySelectorAll<HTMLButtonElement>('.indicador');
    indicadores[1].click();
    await fixture!.whenStable();
    expect(component.peliculaActiva()?.id).toBe(9);
    expect(
      [...indicadores].filter((indicador) => indicador.getAttribute('aria-current') === 'true'),
    ).toEqual([indicadores[1]]);
    expect(raiz.querySelector('.boton-entradas')?.getAttribute('href')).toBe('/pelicula/9');
  });

  it('suspende por hover y foco, sin perder la pausa elegida por la persona', async () => {
    const raiz = await iniciar();
    component.cambiarHover(true);
    await avanzar(10000);
    expect(component.indiceActual()).toBe(0);
    component.cambiarHover(false);
    await avanzar(5000);
    expect(component.indiceActual()).toBe(1);

    component.entrarFoco();
    component.cambiarHover(true);
    component.cambiarHover(false);
    component.salirFoco(
      new FocusEvent('focusout', { relatedTarget: raiz.querySelector('.boton-entradas') }),
    );
    await avanzar(10000);
    expect(component.indiceActual()).toBe(1);
    component.salirFoco(new FocusEvent('focusout', { relatedTarget: document.body }));
    await avanzar(5000);
    expect(component.indiceActual()).toBe(2);

    raiz.querySelector<HTMLButtonElement>('.boton-pausa')!.click();
    await fixture!.whenStable();
    expect(component.pausado()).toBe(true);
    component.cambiarHover(true);
    component.cambiarHover(false);
    component.entrarFoco();
    component.salirFoco(new FocusEvent('focusout', { relatedTarget: document.body }));
    await avanzar(10000);
    expect(component.indiceActual()).toBe(2);
    component.entrarFoco();
    component.cambiarHover(true);
    raiz.querySelector<HTMLButtonElement>('.boton-pausa')!.click();
    await avanzar(5000);
    expect(component.indiceActual()).toBe(0);
    expect(component.pausado()).toBe(false);
  });

  it('no rota en una pestaña oculta y reanuda al volver sin avanzar de golpe', async () => {
    await iniciar();
    await avanzar(5000);
    expect(component.indiceActual()).toBe(1);
    pestanaOculta = true;
    document.dispatchEvent(new Event('visibilitychange'));
    await avanzar(15000);
    expect(component.indiceActual()).toBe(1);
    expect(vi.getTimerCount()).toBe(0);

    pestanaOculta = false;
    document.dispatchEvent(new Event('visibilitychange'));
    await avanzar(4999);
    expect(component.indiceActual()).toBe(1);
    await avanzar(1);
    expect(component.indiceActual()).toBe(2);
    expect(vi.getTimerCount()).toBe(1);
  });

  it('respeta el movimiento reducido al entrar y permite la navegación manual', async () => {
    movimientoReducido = true;
    const raiz = await iniciar();
    expect(component.pausado()).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
    await avanzar(15000);
    expect(component.indiceActual()).toBe(0);
    raiz.querySelector<HTMLButtonElement>('.flecha-siguiente')!.click();
    await fixture!.whenStable();
    expect(component.peliculaActiva()?.id).toBe(9);
    await avanzar(10000);
    expect(component.peliculaActiva()?.id).toBe(9);
  });

  it('pausa si se activa la preferencia de movimiento reducido durante la rotación', async () => {
    await iniciar();
    await avanzar(5000);
    movimientoReducido = true;
    medios.dispatchEvent(Object.assign(new Event('change'), { matches: true }));
    await avanzar(10000);
    expect(component.pausado()).toBe(true);
    expect(component.indiceActual()).toBe(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('actualiza listas vacías o de una película sin timer y normaliza la selección al reducir el ranking', async () => {
    const raiz = await iniciar([]);
    expect(component.peliculaActiva()).toBeUndefined();
    expect(vi.getTimerCount()).toBe(0);
    expect(raiz.querySelector('.boton-entradas')).toBeNull();
    expect(raiz.querySelector('.flecha-siguiente')).toBeNull();

    fixture!.componentRef.setInput('peliculas', ranking.slice(0, 1));
    await fixture!.whenStable();
    expect(component.peliculaActiva()?.id).toBe(47);
    expect(vi.getTimerCount()).toBe(0);
    expect(raiz.querySelector('.indicador')).toBeNull();
    expect(raiz.querySelector('.boton-pausa')).toBeNull();

    fixture!.componentRef.setInput('peliculas', ranking.slice(0, 2));
    await fixture!.whenStable();
    expect(vi.getTimerCount()).toBe(1);
    await avanzar(5000);
    expect(component.peliculaActiva()?.id).toBe(9);
    fixture!.componentRef.setInput('peliculas', ranking.slice(0, 1));
    await fixture!.whenStable();
    expect(component.indiceActual()).toBe(0);
    expect(component.peliculaActiva()?.id).toBe(47);
    expect(vi.getTimerCount()).toBe(0);

    fixture!.componentRef.setInput('peliculas', []);
    await fixture!.whenStable();
    expect(component.peliculaActiva()).toBeUndefined();
    expect(raiz.querySelector('.boton-entradas')).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('limpia el intervalo y los listeners al destruir sin rotaciones tardías', async () => {
    await iniciar();
    await avanzar(5000);
    const indiceAlSalir = component.indiceActual();
    fixture!.destroy();
    fixture = undefined;
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(15000);
    expect(component.indiceActual()).toBe(indiceAlSalir);

    movimientoReducido = true;
    medios.dispatchEvent(Object.assign(new Event('change'), { matches: true }));
    document.dispatchEvent(new Event('visibilitychange'));
    expect(component.pausado()).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });
});
