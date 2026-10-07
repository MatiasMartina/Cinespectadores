import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { vi } from 'vitest';
import { Perfil } from './perfil';
import { Usuarios } from '../../services/usuarios';
import { Beneficios } from '../../services/beneficios';
import { Compra } from '../../services/compra';
import { Usuario } from '../../models/usuario';
import { Recompensa } from '../../models/beneficios';
import { Venta } from '../../models/venta';

vi.mock('qrcode', () => ({ default: { toDataURL: async () => 'data:image/png;base64,AA==' } }));
const producto: Recompensa = {
  id: 2,
  nombre: 'Pochoclos gratis',
  tipo: 'producto',
  productoId: 1,
  puntos: 150,
  activa: true,
};
const entrada: Recompensa = {
  id: 1,
  nombre: 'Entrada gratis',
  tipo: 'entrada',
  puntos: 500,
  activa: true,
};
const venta: Venta = {
  fechaCompra: new Date().toISOString(),
  entrada: {
    codigo: 'CINE-CANJE',
    soloCandy: true,
    funcionId: 0,
    pelicula: 'Canje de Candy Bar',
    fecha: '',
    hora: '',
    salaNumero: 0,
    formato: '',
    idioma: '',
    butacas: [],
    total: 0,
    puntosUsados: 150,
    productosCandy: [
      { productoId: 1, nombre: 'Pochoclos', cantidad: 1, precioUnitario: 4500, subtotal: 4500 },
    ],
  },
};

describe('Mi cuenta: canjes de productos', () => {
  let fixture: ComponentFixture<Perfil>;
  let cuenta: BehaviorSubject<Usuario | undefined>;
  let beneficios: {
    recompensas: ReturnType<typeof signal<Recompensa[]>>;
    cargar: ReturnType<typeof vi.fn>;
    getMovimientos: ReturnType<typeof vi.fn>;
    getMovimientosCredito: ReturnType<typeof vi.fn>;
    getMisCanjes: ReturnType<typeof vi.fn>;
    canjearProducto: ReturnType<typeof vi.fn>;
  };
  beforeEach(async () => {
    cuenta = new BehaviorSubject<Usuario | undefined>({
      id: 1,
      authId: 'cuenta-prueba',
      nombre: 'Ana',
      apellido: 'Cine',
      email: 'ana@cine.test',
      fechaNacimiento: '1980-01-01',
      puntos: 116300,
      credito: 195100,
      rol: 'cliente',
    });
    beneficios = {
      recompensas: signal([entrada, producto]),
      cargar: vi.fn(async () => {}),
      getMovimientos: vi.fn(async () => []),
      getMovimientosCredito: vi.fn(async () => []),
      getMisCanjes: vi.fn(async () => []),
      canjearProducto: vi.fn(async () => structuredClone(venta)),
    };
    await TestBed.configureTestingModule({
      imports: [Perfil],
      providers: [
        provideRouter([]),
        {
          provide: Usuarios,
          useValue: { usuarioActual$: cuenta.asObservable(), actualizarPerfil: async () => {} },
        },
        { provide: Beneficios, useValue: beneficios },
        { provide: Compra, useValue: { getFuncion: () => undefined } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(Perfil);
    await fixture.whenStable();
    await vi.waitFor(() => expect(fixture.componentInstance.cargando()).toBe(false));
    await fixture.whenStable();
  });
  it('habilita Canjear con saldo suficiente sin pedir una función ni mostrar falta de puntos', () => {
    const boton = fixture.nativeElement.querySelector('.acciones-canje button');
    expect(boton.disabled).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Disponible para canjear');
    expect(fixture.nativeElement.textContent).not.toContain('Te faltan');
  });
  it('permite canjear con el saldo exacto y deshabilita solo cuando falta saldo', async () => {
    cuenta.next({ ...cuenta.value!, puntos: 150 });
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.acciones-canje button').disabled).toBe(false);
    cuenta.next({ ...cuenta.value!, puntos: 149 });
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.acciones-canje button').disabled).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Te faltan 1 puntos');
  });
  it('confirma el canje y muestra un QR de retiro sin datos de película o butacas', async () => {
    beneficios.getMisCanjes.mockResolvedValue([venta]);
    await fixture.componentInstance.canjear(producto);
    await fixture.whenStable();
    expect(beneficios.canjearProducto).toHaveBeenCalledWith(producto, 1, expect.any(String));
    expect(fixture.nativeElement.querySelector('.qr-canje img')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.qr-canje').textContent).toContain(
      'Pendiente de retiro',
    );
    expect(fixture.nativeElement.querySelector('.qr-canje').textContent).toContain('CINE-CANJE');
    expect(fixture.nativeElement.querySelector('.qr-canje').textContent).not.toContain('Sala');
  });
  it('limita la cantidad a los puntos disponibles y admite varias unidades', async () => {
    cuenta.next({ ...cuenta.value!, puntos: 450 });
    const component = fixture.componentInstance;
    component.cantidades[producto.id] = 99;
    component.normalizarCantidad(producto);
    expect(component.cantidades[producto.id]).toBe(3);
    await component.canjear(producto);
    expect(beneficios.canjearProducto).toHaveBeenCalledWith(producto, 3, expect.any(String));
  });
  it('conserva la solicitud al reintentar un fallo de conexión y evita doble clic', async () => {
    beneficios.canjearProducto.mockRejectedValueOnce(new Error('Conexión interrumpida'));
    const component = fixture.componentInstance;
    await component.canjear(producto);
    const solicitud = beneficios.canjearProducto.mock.calls[0][2];
    expect(component.error()).toBe(true);
    await Promise.all([component.canjear(producto), component.canjear(producto)]);
    expect(beneficios.canjearProducto).toHaveBeenCalledTimes(2);
    expect(beneficios.canjearProducto.mock.calls[1][2]).toBe(solicitud);
  });
  it('una entrada lleva a elegir función y no utiliza el canje directo de productos', async () => {
    await fixture.componentInstance.canjear(entrada);
    expect(beneficios.canjearProducto).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('.tarjeta-recompensa a').getAttribute('href')).toBe(
      '/',
    );
  });
});
