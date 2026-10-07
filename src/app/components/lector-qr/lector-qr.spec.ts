import { Supabase } from '../../services/supabase';
import { crearSupabaseDePrueba, prepararCatalogoDePrueba } from '../../testing/supabase-pruebas';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, vi } from 'vitest';
import { LectorQr } from './lector-qr';

const lector = vi.hoisted(() => ({
  isScanning: false,
  start: vi.fn(),
  stop: vi.fn(),
  clear: vi.fn(),
}));
vi.mock('html5-qrcode', () => ({
  Html5Qrcode: function () {
    return lector;
  },
  Html5QrcodeSupportedFormats: { QR_CODE: 0 },
}));

describe('LectorQr', () => {
  let fixture: ComponentFixture<LectorQr>;
  let component: LectorQr;
  let reconocer: (texto: string) => void;
  let sinQr: () => void;

  beforeEach(async () => {
    vi.resetAllMocks();
    lector.isScanning = false;
    lector.start.mockImplementation(async (_camara, _configuracion, exito, fallo) => {
      reconocer = exito;
      sinQr = fallo;
      lector.isScanning = true;
    });
    lector.stop.mockImplementation(async () => {
      lector.isScanning = false;
    });
    await TestBed.configureTestingModule({
      providers: [{ provide: Supabase, useValue: crearSupabaseDePrueba() }],
      imports: [LectorQr],
    }).compileComponents();
    fixture = TestBed.createComponent(LectorQr);
    component = fixture.componentInstance;
  });
  afterEach(() => vi.restoreAllMocks());

  async function iniciarVista() {
    await fixture.whenStable();
    await vi.waitFor(() => {
      expect(lector.start).toHaveBeenCalled();
      expect(component.ocupado()).toBe(false);
    });
    await fixture.whenStable();
  }

  it('abre la cámara al entrar sin hacer clic y mantiene visible el visor', async () => {
    await iniciarVista();
    expect(lector.start).toHaveBeenCalledTimes(1);
    expect(component.camaraActiva()).toBe(true);
    expect(fixture.nativeElement.querySelector('.video-qr')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('En vivo');
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
    expect(fixture.nativeElement.querySelector('input[type="file"]')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Leer imagen');
    expect(fixture.nativeElement.textContent).not.toContain('Cerrar cámara');
  });

  it('evita repetir el QR de cada fotograma y sigue leyendo otros sin cerrar la cámara', async () => {
    await iniciarVista();
    const recibido = vi.fn();
    component.codigoLeido.subscribe(recibido);
    reconocer('CINE-UNO');
    reconocer('CINE-UNO');
    reconocer('CINE-DOS');
    reconocer('CINE-DOS');
    expect(recibido.mock.calls).toEqual([['CINE-UNO'], ['CINE-DOS']]);
    expect(lector.stop).not.toHaveBeenCalled();
    expect(component.camaraActiva()).toBe(true);
  });

  it('permite leer el mismo QR al pasar a otro sector sin reiniciar el video', async () => {
    fixture.componentRef.setInput('contexto', 'cine');
    await iniciarVista();
    const recibido = vi.fn();
    component.codigoLeido.subscribe(recibido);
    reconocer('CINE-UNO');
    fixture.componentRef.setInput('contexto', 'candy');
    await fixture.whenStable();
    reconocer('CINE-UNO');
    reconocer('CINE-UNO');
    expect(recibido).toHaveBeenCalledTimes(2);
    expect(lector.start).toHaveBeenCalledTimes(1);
    expect(lector.stop).not.toHaveBeenCalled();
  });

  it('no reemplaza la compra mientras el padre está consultando o validando', async () => {
    await iniciarVista();
    const recibido = vi.fn();
    component.codigoLeido.subscribe(recibido);
    fixture.componentRef.setInput('bloqueado', true);
    reconocer('CINE-UNO');
    expect(recibido).not.toHaveBeenCalled();
    fixture.componentRef.setInput('bloqueado', false);
    reconocer('CINE-UNO');
    expect(recibido).toHaveBeenCalledExactlyOnceWith('CINE-UNO');
  });

  it('vuelve a leer un QR después de retirarlo del visor', async () => {
    await iniciarVista();
    const recibido = vi.fn();
    component.codigoLeido.subscribe(recibido);
    const reloj = vi.spyOn(Date, 'now').mockReturnValue(2000);
    reconocer('CINE-UNO');
    reloj.mockReturnValue(3600);
    sinQr();
    reconocer('CINE-UNO');
    expect(recibido).toHaveBeenCalledTimes(2);
  });

  it('muestra el permiso bloqueado sin insistir automáticamente', async () => {
    lector.start.mockRejectedValueOnce('NotAllowedError: Permission denied');
    await iniciarVista();
    expect(component.camaraActiva()).toBe(false);
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'El navegador bloqueó la cámara',
    );
    expect(lector.start).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
  });

  it('cierra la cámara al salir y no emite códigos tardíos', async () => {
    await iniciarVista();
    const recibido = vi.fn();
    component.codigoLeido.subscribe(recibido);
    fixture.destroy();
    await Promise.resolve();
    reconocer('CINE-TARDIO');
    expect(lector.stop).toHaveBeenCalledTimes(1);
    expect(lector.isScanning).toBe(false);
    expect(recibido).not.toHaveBeenCalled();
  });

  it('cierra una cámara cuya apertura termina después de salir de la página', async () => {
    let resolver!: () => void;
    lector.start.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolver = () => {
            lector.isScanning = true;
            resolve();
          };
        }),
    );
    await fixture.whenStable();
    await vi.waitFor(() => expect(lector.start).toHaveBeenCalledTimes(1));
    fixture.destroy();
    resolver();
    await vi.waitFor(() => expect(lector.stop).toHaveBeenCalledTimes(1));
    expect(lector.isScanning).toBe(false);
  });
});
