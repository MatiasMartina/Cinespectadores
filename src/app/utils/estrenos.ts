import { Pelicula } from '../models/pelicula';
import { Funcion } from '../models/funcion';
import { Venta } from '../models/venta';

export function fechaArgentina(ahora = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(ahora);
}
export function sumarDias(fecha: string, dias: number): string {
  const resultado = new Date(fecha + 'T12:00:00Z');
  resultado.setUTCDate(resultado.getUTCDate() + dias);
  return resultado.toISOString().slice(0, 10);
}
export function estadoVenta(
  pelicula: Pelicula,
  hoy = fechaArgentina(),
): 'oculta' | 'proximamente' | 'preventa' | 'cartelera' {
  if (pelicula.activa === false) return 'oculta';
  if (!pelicula.fechaEstreno || pelicula.fechaEstreno <= hoy) return 'cartelera';
  return pelicula.preventaHabilitada &&
    (pelicula.precioPreventa ?? 0) > 0 &&
    hoy >= sumarDias(pelicula.fechaEstreno, -(pelicula.diasPreventa ?? 7))
    ? 'preventa'
    : 'proximamente';
}
export function precioVigente(
  funcion: Funcion,
  pelicula: Pelicula,
  hoy = fechaArgentina(),
): Funcion {
  const esPreventa = estadoVenta(pelicula, hoy) === 'preventa';
  const precioNormal = funcion.precioNormal ?? funcion.precio;
  return {
    ...funcion,
    precioNormal,
    esPreventa,
    precio: esPreventa ? pelicula.precioPreventa! : precioNormal,
  };
}
export function inicioFuncion(venta: Venta): number {
  return new Date(`${venta.entrada.fecha}T${venta.entrada.hora}:00-03:00`).getTime();
}
export function puedeCancelar(venta: Venta, ahora = Date.now()): boolean {
  return (
    !venta.cancelacion &&
    !venta.ingreso &&
    !venta.candy &&
    inicioFuncion(venta) - ahora >= 2 * 60 * 60 * 1000
  );
}
export function yaVista(venta: Venta, ahora = Date.now()): boolean {
  return !venta.cancelacion && (!!venta.ingreso || inicioFuncion(venta) <= ahora);
}
export function rangoPeriodo(
  fecha: string,
  periodo: 'semana' | 'mes',
): { desde: string; hasta: string } {
  const dia = new Date(fecha + 'T12:00:00Z');
  if (periodo === 'semana') {
    const desde = sumarDias(fecha, -((dia.getUTCDay() + 6) % 7));
    return { desde, hasta: sumarDias(desde, 6) };
  }
  const desde = fecha.slice(0, 7) + '-01';
  const ultimo = new Date(Date.UTC(dia.getUTCFullYear(), dia.getUTCMonth() + 1, 0, 12));
  return { desde, hasta: ultimo.toISOString().slice(0, 10) };
}
