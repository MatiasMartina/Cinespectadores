import { cotizarCompra, DatosCotizacion } from './cotizacion';
const producto = {
  id: 1,
  nombre: 'Pochoclos',
  precio: 4500,
  imagenUrl: 'https://example.test/p.jpg',
  categoriaId: 1,
  activo: true,
};
const bebida = { ...producto, id: 2, nombre: 'Bebida', precio: 3000, categoriaId: 2 };
const base: DatosCotizacion = {
  precioEntrada: 8000,
  cantidadEntradas: 1,
  cantidadVip: 0,
  extraVip: 2000,
  productos: [producto, bebida],
  items: [],
  cantidadCombos: 0,
  recompensas: [
    { id: 1, nombre: 'Entrada', tipo: 'entrada', puntos: 500, activa: true },
    { id: 2, nombre: 'Pochoclos', tipo: 'producto', productoId: 1, puntos: 150, activa: true },
  ],
  canjes: [],
  puntosDisponibles: 1000,
  porcentajePrimeraCompra: 0,
  porcentajeCupon: 0,
};
describe('Cotización de combos y canjes', () => {
  it('explica el combo de $12.000 con entrada de $9.500 y ahorro de $5.000', () => {
    const c = cotizarCompra({
      ...base,
      precioEntrada: 9500,
      cantidadCombos: 1,
      combo: { id: 1, nombre: 'Combo', precio: 12000, pochoclosId: 1, bebidaId: 2, activo: true },
    });
    expect(c.subtotal).toBe(17000);
    expect(c.ahorroCombo).toBe(5000);
    expect(c.total).toBe(12000);
    expect(c.productosCandy.map((p) => p.subtotal)).toEqual([4500, 3000]);
  });

  it('elige el mayor beneficio y lo calcula después del precio fijo del combo', () => {
    const c = cotizarCompra({
      ...base,
      combo: { id: 1, nombre: 'Combo', precio: 12000, pochoclosId: 1, bebidaId: 2, activo: true },
      cantidadCombos: 1,
      porcentajePrimeraCompra: 20,
      porcentajeCupon: 30,
    });
    expect(c.subtotal).toBe(15500);
    expect(c.ahorroCombo).toBe(3500);
    expect(c.total).toBe(8400);
  });
  it('canjea una entrada común gratis y conserva el adicional VIP', () => {
    const c = cotizarCompra({
      ...base,
      cantidadVip: 1,
      canjes: [{ recompensaId: 1, cantidad: 1 }],
    });
    expect(c.total).toBe(2000);
    expect(c.puntosUsados).toBe(500);
  });
  it('agrega los productos gratuitos a la entrega del QR sin cobrarlos', () => {
    const c = cotizarCompra({ ...base, canjes: [{ recompensaId: 2, cantidad: 2 }] });
    expect(c.subtotal).toBe(17000);
    expect(c.total).toBe(8000);
    expect(c.puntosUsados).toBe(300);
    expect(c.productosCandy[0].cantidad).toBe(2);
  });
  it('agrupa un producto comprado, uno del combo y uno canjeado', () => {
    const c = cotizarCompra({
      ...base,
      cantidadCombos: 1,
      combo: { id: 1, nombre: 'Combo', precio: 12000, pochoclosId: 1, bebidaId: 2, activo: true },
      items: [
        { productoId: 1, nombre: 'Pochoclos', cantidad: 1, precioUnitario: 4500, subtotal: 4500 },
      ],
      canjes: [{ recompensaId: 2, cantidad: 1 }],
    });
    expect(c.total).toBe(16500);
    expect(c.productosCandy.find((p) => p.productoId === 1)?.cantidad).toBe(3);
    expect(c.productosCandy).toHaveLength(2);
  });
  it('no permite usar una misma entrada para combo y canje', () => {
    expect(() =>
      cotizarCompra({
        ...base,
        cantidadCombos: 1,
        combo: { id: 1, nombre: 'Combo', precio: 12000, pochoclosId: 1, bebidaId: 2, activo: true },
        canjes: [{ recompensaId: 1, cantidad: 1 }],
      }),
    ).toThrow('combo y a un canje');
  });
  it('rechaza saldo insuficiente, productos inactivos y cantidades fraccionarias', () => {
    expect(() =>
      cotizarCompra({
        ...base,
        puntosDisponibles: 499,
        canjes: [{ recompensaId: 1, cantidad: 1 }],
      }),
    ).toThrow('puntos suficientes');
    expect(() =>
      cotizarCompra({
        ...base,
        productos: [{ ...producto, activo: false }, bebida],
        canjes: [{ recompensaId: 2, cantidad: 1 }],
      }),
    ).toThrow('ya no está disponible');
    expect(() => cotizarCompra({ ...base, canjes: [{ recompensaId: 2, cantidad: 1.5 }] })).toThrow(
      'cantidad',
    );
  });
  it('permite varias entradas y conserva el precio fijo aunque sea mayor al valor individual', () => {
    const c = cotizarCompra({
      ...base,
      cantidadEntradas: 2,
      cantidadCombos: 1,
      combo: { id: 1, nombre: 'Combo', precio: 16000, pochoclosId: 1, bebidaId: 2, activo: true },
    });
    expect(c.ahorroCombo).toBe(-500);
    expect(c.total).toBe(24000);
  });
});
