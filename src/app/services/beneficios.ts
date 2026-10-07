import { mensajeServidor } from '../utils/errores';
import { inject, Injectable, signal } from '@angular/core';
import { Combo, Recompensa, MovimientoPuntos } from '../models/beneficios';
import { Supabase } from './supabase';
import { MovimientoCredito } from '../models/seguimiento';
import { Venta } from '../models/venta';
@Injectable({ providedIn: 'root' })
export class Beneficios {
  private supabase = inject(Supabase);
  combos = signal<Combo[]>([]);
  recompensas = signal<Recompensa[]>([]);
  async cargar(): Promise<void> {
    const [combos, recompensas] = await Promise.all([
      this.supabase.cliente.from('combos').select('*').order('nombre'),
      this.supabase.cliente.from('recompensas').select('*').order('puntos'),
    ]);
    if (combos.error || recompensas.error)
      throw new Error('No se pudieron cargar los combos y recompensas.');
    this.combos.set(
      combos.data.map((c) => ({
        id: c.id,
        nombre: c.nombre,
        precio: Number(c.precio),
        pochoclosId: c.pochoclos_id,
        bebidaId: c.bebida_id,
        activo: c.activo,
      })),
    );
    this.recompensas.set(
      recompensas.data.map((r) => ({
        id: r.id,
        nombre: r.nombre,
        tipo: r.tipo,
        productoId: r.producto_id ?? undefined,
        puntos: Number(r.puntos),
        activa: r.activa,
      })),
    );
  }
  async guardarCombo(datos: Omit<Combo, 'id'>, id?: number): Promise<void> {
    if (
      !datos.nombre.trim() ||
      !Number.isInteger(datos.precio) ||
      datos.precio <= 0 ||
      !datos.pochoclosId ||
      !datos.bebidaId ||
      datos.pochoclosId === datos.bebidaId
    )
      throw new Error('Completá nombre, precio, pochoclos y bebida distintos.');
    const fila = {
      nombre: datos.nombre.trim(),
      precio: datos.precio,
      pochoclos_id: datos.pochoclosId,
      bebida_id: datos.bebidaId,
      activo: datos.activo,
    };
    const tabla = this.supabase.cliente.from('combos');
    const { error } =
      id === undefined ? await tabla.insert(fila) : await tabla.update(fila).eq('id', id);
    if (error)
      throw new Error(mensajeServidor(error, 'No se pudo guardar el combo. Intentá nuevamente.'));
    await this.cargar();
  }
  async guardarRecompensa(datos: Omit<Recompensa, 'id'>, id?: number): Promise<void> {
    if (
      !datos.nombre.trim() ||
      !Number.isInteger(datos.puntos) ||
      datos.puntos <= 0 ||
      (datos.tipo === 'producto' && !datos.productoId)
    )
      throw new Error('Completá la recompensa y un costo entero de puntos mayor a cero.');
    const fila = {
      nombre: datos.nombre.trim(),
      tipo: datos.tipo,
      producto_id: datos.tipo === 'producto' ? datos.productoId : null,
      puntos: datos.puntos,
      activa: datos.activa,
    };
    const tabla = this.supabase.cliente.from('recompensas');
    const { error } =
      id === undefined ? await tabla.insert(fila) : await tabla.update(fila).eq('id', id);
    if (error)
      throw new Error(
        mensajeServidor(error, 'No se pudo guardar la recompensa. Intentá nuevamente.'),
      );
    await this.cargar();
  }
  async getMovimientos(): Promise<MovimientoPuntos[]> {
    const { data, error } = await this.supabase.cliente
      .from('movimientos_puntos')
      .select('*')
      .order('fecha', { ascending: false });
    if (error) throw new Error('No se pudo cargar el historial de puntos.');
    return data.map((m) => ({
      id: m.id,
      fecha: m.fecha,
      tipo: m.tipo,
      puntos: Number(m.puntos),
      detalle: m.detalle,
      codigoVenta: m.codigo_venta,
      cantidad: m.cantidad,
    }));
  }
  async getMovimientosCredito(): Promise<MovimientoCredito[]> {
    const { data, error } = await this.supabase.cliente
      .from('movimientos_credito')
      .select('*')
      .order('fecha', { ascending: false });
    if (error) throw new Error('No se pudo cargar el historial de crédito.');
    return data.map((m) => ({
      id: m.id,
      fecha: m.fecha,
      importe: Number(m.importe),
      tipo: m.tipo,
      codigoVenta: m.codigo_venta,
      detalle: m.detalle,
    }));
  }
  async canjearProducto(
    recompensa: Recompensa,
    cantidad: number,
    solicitud: string,
  ): Promise<Venta> {
    const { data, error } = await this.supabase.cliente.rpc('canjear_producto', {
      p_recompensa_id: recompensa.id,
      p_cantidad: cantidad,
      p_puntos_esperados: recompensa.puntos * cantidad,
      p_solicitud: solicitud,
    });
    if (error)
      throw new Error(mensajeServidor(error, 'No se pudo completar el canje. Intentá nuevamente.'));
    if (!data?.entrada?.codigo) throw new Error('No se recibió el código del canje.');
    return data as Venta;
  }
  async getMisCanjes(): Promise<Venta[]> {
    const { data, error } = await this.supabase.cliente.rpc('mis_canjes_productos');
    if (error) throw new Error('No se pudieron consultar tus canjes.');
    return (data ?? []) as Venta[];
  }
}
