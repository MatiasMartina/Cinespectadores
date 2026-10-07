import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { Empleados } from './empleados';
import { LectorQr } from '../../components/lector-qr/lector-qr';
import { Venta, ResultadoVenta } from '../../models/venta';
import { Ventas } from '../../services/ventas';
import { Butacas } from '../../services/butacas';
import { Funciones } from '../../services/funciones';
import { crearSupabaseDePrueba } from '../../testing/supabase-pruebas';
import { Supabase } from '../../services/supabase';

@Component({ selector: 'app-lector-qr', template: '' })
class LectorQrPrueba {
  codigoLeido = output<string>();
  bloqueado = input(false);
  contexto = input('');
}

const compra: Venta = {
  fechaCompra: '2026-10-04T03:00:00Z',
  entrada: {
    codigo: 'CINE-PRUEBA',
    funcionId: 3,
    pelicula: 'Película ATP',
    fecha: '2026-10-10',
    hora: '16:00',
    salaNumero: 3,
    formato: '2D',
    idioma: 'Castellano',
    butacas: ['A-4'],
    productosCandy: [
      {
        productoId: 1,
        nombre: 'Pochoclos',
        cantidad: 2,
        precioUnitario: 1000,
        subtotal: 2000,
      },
    ],
    total: 9000,
  },
};

describe('Empleados', () => {
  let fixture: ComponentFixture<Empleados>;
  let component: Empleados;
  let servicio: {
    buscarCodigo: ReturnType<typeof vi.fn>;
    validarCodigo: ReturnType<typeof vi.fn>;
  };

  const filas = [
    {
      nombre: 'A',
      butacas: [
        { id: 'A-4', fila: 'A', numero: 4, tipo: 'Comun' },
        { id: 'A-5', fila: 'A', numero: 5, tipo: 'VIP' },
      ],
    },
  ];
  const getFilasButacas = vi.fn();

  beforeEach(async () => {
    servicio = { buscarCodigo: vi.fn(), validarCodigo: vi.fn() };
    getFilasButacas.mockReset().mockReturnValue(filas);
    await TestBed.configureTestingModule({
      imports: [Empleados],
      providers: [
        { provide: Ventas, useValue: servicio },
        { provide: Butacas, useValue: { getFilasButacas, cargarSalasYPrecios: async () => {} } },
      ],
    })
      .overrideComponent(Empleados, {
        remove: { imports: [LectorQr] },
        add: { imports: [LectorQrPrueba, FormsModule] },
      })
      .compileComponents();
    fixture = TestBed.createComponent(Empleados);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('muestra la compra al finalizar la consulta sin tocar el formulario', async () => {
    let resolver!: (venta: Venta) => void;
    servicio.buscarCodigo.mockImplementationOnce(
      () =>
        new Promise<Venta>((resolve) => {
          resolver = resolve;
        }),
    );
    component.codigo = compra.entrada.codigo;
    const buscando = component.buscar();
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Buscando compra');
    expect(component.procesando()).toBe(true);
    resolver(structuredClone(compra));
    await buscando;
    await fixture.whenStable();
    expect(component.procesando()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Película ATP');
    expect(fixture.nativeElement.textContent).toContain('A-4');
  });

  it('distingue un problema de conexión de un código inexistente y quita la compra anterior', async () => {
    component.venta.set(structuredClone(compra));
    component.codigo = 'OTRO-CODIGO';
    servicio.buscarCodigo.mockRejectedValueOnce(new Error('No se pudo consultar la compra.'));
    await component.buscar();
    await fixture.whenStable();
    expect(component.venta()).toBeUndefined();
    expect(component.error()).toBe(true);
    expect(component.procesando()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('No se pudo consultar');
    expect(fixture.nativeElement.textContent).not.toContain('Película ATP');
  });

  it('impide confirmar dos veces o cambiar de sector mientras guarda', async () => {
    let resolver!: (resultado: ResultadoVenta) => void;
    servicio.validarCodigo.mockImplementationOnce(
      () =>
        new Promise<ResultadoVenta>((resolve) => {
          resolver = resolve;
        }),
    );
    component.venta.set(structuredClone(compra));
    const validando = component.validar();
    component.cambiarSector('candy');
    await component.validar();
    expect(component.sector).toBe('cine');
    expect(servicio.validarCodigo).toHaveBeenCalledTimes(1);
    resolver({
      valido: true,
      mensaje: 'Entrada validada.',
      venta: {
        ...structuredClone(compra),
        ingreso: { empleadoId: 2, fecha: new Date().toISOString() },
      },
    });
    await validando;
    await fixture.whenStable();
    expect(component.yaUtilizado).toBe(true);
    expect(fixture.nativeElement.querySelector('button.primario').disabled).toBe(true);
    await component.validar();
    expect(servicio.validarCodigo).toHaveBeenCalledTimes(1);
  });

  it('actualiza el estado si otro empleado ya validó la entrada', async () => {
    component.venta.set(structuredClone(compra));
    servicio.validarCodigo.mockResolvedValueOnce({
      valido: false,
      mensaje: 'Esta entrada ya fue validada.',
      venta: {
        ...structuredClone(compra),
        ingreso: { empleadoId: 3, fecha: new Date().toISOString() },
      },
    });
    await component.validar();
    await fixture.whenStable();
    expect(component.error()).toBe(true);
    expect(component.yaUtilizado).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Ya validado');
    expect(fixture.nativeElement.querySelector('button.primario').disabled).toBe(true);
  });

  it('permite entregar Candy después del ingreso y rechaza entregas sin productos', async () => {
    component.cambiarSector('candy');
    const ingresada = {
      ...structuredClone(compra),
      ingreso: { empleadoId: 2, fecha: new Date().toISOString() },
    };
    component.venta.set(ingresada);
    expect(component.yaUtilizado).toBe(false);
    servicio.validarCodigo.mockResolvedValueOnce({
      valido: true,
      mensaje: 'Entrega confirmada.',
      venta: {
        ...ingresada,
        candy: { empleadoId: 2, fecha: new Date().toISOString() },
      },
    });
    await component.validar();
    expect(servicio.validarCodigo).toHaveBeenCalledWith(compra.entrada.codigo, 'candy');
    expect(component.yaUtilizado).toBe(true);
    component.cambiarSector('candy');
    const sinCandy = structuredClone(compra);
    sinCandy.entrada.productosCandy = [];
    component.venta.set(sinCandy);
    await component.validar();
    expect(servicio.validarCodigo).toHaveBeenCalledTimes(1);
  });
  it('busca el código escrito en el formulario y borra el resultado si se modifica', async () => {
    servicio.buscarCodigo.mockResolvedValueOnce(structuredClone(compra));
    const input: HTMLInputElement = fixture.nativeElement.querySelector('#codigoManual');
    input.value = compra.entrada.codigo;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
    expect(servicio.buscarCodigo).toHaveBeenCalledWith(compra.entrada.codigo);
    expect(fixture.nativeElement.textContent).toContain('Película ATP');
    input.value = 'CINE-OTRA-COMPRA';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
    expect(component.venta()).toBeUndefined();
    expect(fixture.nativeElement.textContent).not.toContain('Película ATP');
  });
  it('muestra fila, número y mapa de la sala correcta, sin productos de Candy', async () => {
    servicio.buscarCodigo.mockResolvedValueOnce(structuredClone(compra));
    component.codigo = compra.entrada.codigo;
    await component.buscar();
    await fixture.whenStable();
    expect(getFilasButacas).toHaveBeenCalledWith(3);
    const panel = fixture.nativeElement.querySelector('.detalle-validacion');
    expect(panel.textContent).toContain('Fila A · Butaca 4');
    expect(panel.textContent).not.toContain('Pochoclos');
    expect(panel.textContent).not.toContain('Entrega de Candy Bar');
    const mapa = fixture.nativeElement.querySelector('.panel-mapa app-mapa-butacas');
    expect(panel.querySelector('app-mapa-butacas')).toBeNull();
    const marcada = mapa.querySelector('button.seleccionada');
    expect(marcada.getAttribute('aria-label')).toContain('A-4');
    expect(marcada.disabled).toBe(true);
    expect(mapa.querySelector('button:not(.seleccionada)').disabled).toBe(true);
  });

  it('en Candy muestra cantidades y entrega, sin película, ubicaciones ni estado del cine', async () => {
    component.cambiarSector('candy');
    servicio.buscarCodigo.mockResolvedValueOnce(structuredClone(compra));
    component.codigo = compra.entrada.codigo;
    await component.buscar();
    await fixture.whenStable();
    const panel = fixture.nativeElement.querySelector('.detalle-validacion');
    const productos = fixture.nativeElement.querySelector('.panel-mapa');
    expect(productos.textContent).toContain('2 ×');
    expect(productos.textContent).toContain('Pochoclos');
    expect(panel.textContent).not.toContain('Pochoclos');
    expect(panel.textContent).toContain('Entrega de Candy Bar');
    expect(panel.textContent).not.toContain('Película ATP');
    expect(panel.textContent).not.toContain('A-4');
    expect(panel.textContent).not.toContain('Ingreso al cine');
    expect(panel.querySelector('app-mapa-butacas')).toBeNull();
    expect(getFilasButacas).not.toHaveBeenCalled();
  });

  it('conserva la lista de ubicaciones si no existe una distribución de la sala', async () => {
    getFilasButacas.mockReturnValueOnce([]);
    servicio.buscarCodigo.mockResolvedValueOnce(structuredClone(compra));
    component.codigo = compra.entrada.codigo;
    await component.buscar();
    await fixture.whenStable();
    const panel = fixture.nativeElement.querySelector('.detalle-validacion');
    expect(panel.textContent).toContain('A-4');
    expect(fixture.nativeElement.querySelector('.panel-mapa').textContent).toContain(
      'distribución de la sala 3 no está',
    );
    expect(panel.querySelector('app-mapa-butacas')).toBeNull();
  });
  it('abre el sector Candy al leer un canje de productos y no dibuja una sala', async () => {
    const canje = structuredClone(compra);
    canje.entrada.soloCandy = true;
    canje.entrada.funcionId = 0;
    canje.entrada.salaNumero = 0;
    canje.entrada.butacas = [];
    servicio.buscarCodigo.mockResolvedValue(canje);
    component.codigo = canje.entrada.codigo;
    await component.buscar();
    await fixture.whenStable();
    expect(component.sector).toBe('candy');
    expect(fixture.nativeElement.querySelector('app-mapa-butacas')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Pochoclos');
  });
});

describe('Mapa de entradas con el servicio de salas', () => {
  it('dibuja la sala 4 y marca L-5, L-6, L-7 y L-8 tras la consulta', async () => {
    localStorage.clear();
    const venta = structuredClone(compra);
    venta.entrada.pelicula = 'Scream 7';
    venta.entrada.salaNumero = 4;
    venta.entrada.butacas = ['L-8', 'L-7', 'L-6', 'L-5'];
    await TestBed.configureTestingModule({
      imports: [Empleados],
      providers: [
        { provide: Ventas, useValue: { buscarCodigo: async () => venta } },
        { provide: Funciones, useValue: {} },
        { provide: Supabase, useValue: crearSupabaseDePrueba() },
      ],
    })
      .overrideComponent(Empleados, {
        remove: { imports: [LectorQr] },
        add: { imports: [LectorQrPrueba, FormsModule] },
      })
      .compileComponents();
    const fixture = TestBed.createComponent(Empleados);
    await fixture.whenStable();
    fixture.componentInstance.codigo = venta.entrada.codigo;
    await fixture.componentInstance.buscar();
    await fixture.whenStable();
    const mapa = fixture.nativeElement.querySelector('app-mapa-butacas');
    expect(mapa).toBeTruthy();
    expect(mapa.querySelectorAll('button')).toHaveLength(518);
    const marcadas: HTMLButtonElement[] = Array.from(mapa.querySelectorAll('button.seleccionada'));
    expect(marcadas.map((boton) => boton.title)).toEqual([
      'Butaca L-5',
      'Butaca L-6',
      'Butaca L-7',
      'Butaca L-8',
    ]);
    expect(marcadas.every((boton) => boton.disabled)).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Fila L · Butaca 8');
  });
});
