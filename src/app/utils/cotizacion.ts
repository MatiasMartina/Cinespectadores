import { Combo, Recompensa, CanjeSeleccionado } from '../models/beneficios';
import { ProductoCandy } from '../models/producto-candy';
import { ItemCandyEntrada } from '../models/entrada';
export interface DatosCotizacion {
  precioEntrada: number;
  cantidadEntradas: number;
  cantidadVip: number;
  extraVip: number;
  productos: ProductoCandy[];
  items: ItemCandyEntrada[];
  combo?: Combo;
  cantidadCombos: number;
  recompensas: Recompensa[];
  canjes: CanjeSeleccionado[];
  puntosDisponibles: number;
  porcentajePrimeraCompra: number;
  porcentajeCupon: number;
}
export function cotizarCompra(d: DatosCotizacion) {
  const producto = (id: number | undefined) => {
    const p = d.productos.find((p) => p.id === id && p.activo !== false);
    if (!p) throw new Error('Un producto del combo o recompensa ya no está disponible.');
    return p;
  };
  let subtotal = d.precioEntrada * d.cantidadEntradas + d.extraVip * d.cantidadVip;
  const items = d.items.map((i) => ({ ...i }));
  const agregar = (p: ProductoCandy, cantidad: number) => {
    const item = items.find((i) => i.productoId === p.id);
    if (item) {
      item.cantidad += cantidad;
      item.subtotal += p.precio * cantidad;
    } else
      items.push({
        productoId: p.id,
        nombre: p.nombre,
        cantidad,
        precioUnitario: p.precio,
        subtotal: p.precio * cantidad,
      });
    subtotal += p.precio * cantidad;
  };
  for (const item of items) subtotal += item.subtotal;
  const cantidad = d.cantidadCombos;
  if (!Number.isInteger(cantidad) || cantidad < 0 || cantidad > d.cantidadEntradas)
    throw new Error('Cada combo requiere una entrada seleccionada.');
  let ahorroCombo = 0;
  if (cantidad > 0) {
    if (!d.combo?.activo) throw new Error('El combo ya no está disponible.');
    const pochoclos = producto(d.combo.pochoclosId),
      bebida = producto(d.combo.bebidaId);
    agregar(pochoclos, cantidad);
    agregar(bebida, cantidad);
    ahorroCombo = (d.precioEntrada + pochoclos.precio + bebida.precio - d.combo.precio) * cantidad;
  }
  let descuentoCanjes = 0,
    puntosUsados = 0,
    entradasGratis = 0;
  if (new Set(d.canjes.map((c) => c.recompensaId)).size !== d.canjes.length)
    throw new Error('Hay recompensas duplicadas.');
  for (const canje of d.canjes) {
    const recompensa = d.recompensas.find((r) => r.id === canje.recompensaId && r.activa);
    if (
      !recompensa ||
      !Number.isInteger(canje.cantidad) ||
      canje.cantidad < 1 ||
      canje.cantidad > 99
    )
      throw new Error('Revisá la recompensa y su cantidad.');
    puntosUsados += recompensa.puntos * canje.cantidad;
    if (recompensa.tipo === 'entrada') {
      entradasGratis += canje.cantidad;
      descuentoCanjes += d.precioEntrada * canje.cantidad;
    } else {
      const p = producto(recompensa.productoId);
      agregar(p, canje.cantidad);
      descuentoCanjes += p.precio * canje.cantidad;
    }
  }
  if (entradasGratis > d.cantidadEntradas)
    throw new Error('Solo podés canjear tantas entradas como butacas seleccionadas.');
  if (entradasGratis + cantidad > d.cantidadEntradas)
    throw new Error('Una entrada no puede pertenecer a un combo y a un canje a la vez.');
  if (puntosUsados > d.puntosDisponibles)
    throw new Error('No tenés puntos suficientes para esos canjes.');
  const basePromocion = subtotal - ahorroCombo - descuentoCanjes;
  const descuentoPrimeraCompra = Math.round((basePromocion * d.porcentajePrimeraCompra) / 100);
  const descuentoCupon = Math.round((basePromocion * d.porcentajeCupon) / 100);
  return {
    subtotal,
    ahorroCombo,
    descuentoCanjes,
    puntosUsados,
    basePromocion,
    descuentoPrimeraCompra,
    descuentoCupon,
    total: Math.max(0, basePromocion - Math.max(descuentoPrimeraCompra, descuentoCupon)),
    productosCandy: items,
  };
}
