import { mensajeServidor } from '../utils/errores';
import { inject, Injectable, signal } from '@angular/core';
import { ProductoCandy } from '../models/producto-candy';
import { CategoriaCandy } from '../models/categoria-candy';
import { ItemCandyEntrada } from '../models/entrada';
import { Supabase } from './supabase';

@Injectable({ providedIn: 'root' })
export class CandyBar {
  private supabase = inject(Supabase);
  private productos = signal<ProductoCandy[]>([]);
  private categorias = signal<CategoriaCandy[]>([]);
  private cantidades = signal<Record<number, number>>(this.cargarPedido());
  private cantidadesOriginales = signal<Record<number, number>>({});
  getTodosLosProductos(): ProductoCandy[] {
    return this.productos();
  }
  getProductos(): ProductoCandy[] {
    return this.productos().filter((p) => p.activo !== false);
  }
  getCategorias(): CategoriaCandy[] {
    return this.categorias();
  }
  async cargar(): Promise<void> {
    const [productos, categorias] = await Promise.all([
      this.supabase.cliente.from('productos_candy').select('*').order('nombre'),
      this.supabase.cliente.from('categorias_candy').select('*').order('nombre'),
    ]);
    if (productos.error || categorias.error) throw new Error('No se pudo cargar el Candy Bar.');
    this.productos.set(
      productos.data.map((p) => ({
        id: p.id,
        nombre: p.nombre,
        precio: Number(p.precio),
        imagenUrl: p.imagen_url,
        categoriaId: p.categoria_id,
        activo: p.activo,
      })),
    );
    this.categorias.set(categorias.data);
  }
  agregarProducto(productoId: number): void {
    if (!this.getProductos().some((producto) => producto.id === productoId)) return;
    this.cantidades.update((cantidades) => ({
      ...cantidades,
      [productoId]: Math.min(99, this.getCantidadProducto(productoId) + 1),
    }));
    this.guardarPedido();
  }
  quitarProducto(productoId: number): void {
    const cantidad = this.getCantidadProducto(productoId);
    this.cantidades.update((cantidades) => {
      const nuevas = { ...cantidades };
      if (cantidad <= 1) delete nuevas[productoId];
      else nuevas[productoId] = cantidad - 1;
      return nuevas;
    });
    this.guardarPedido();
  }
  getCantidadProducto(productoId: number): number {
    return this.cantidades()[productoId] ?? 0;
  }
  getCantidadTotal(): number {
    return this.getProductos().reduce(
      (total, producto) => total + this.getCantidadProducto(producto.id),
      0,
    );
  }
  pedidoDisponible(): boolean {
    return Object.keys(this.cantidades()).every((id) =>
      this.getProductos().some((p) => p.id === Number(id)),
    );
  }
  getItemsPedido(): ItemCandyEntrada[] {
    return this.getProductos()
      .filter((producto) => this.getCantidadProducto(producto.id) > 0)
      .map((producto) => {
        const cantidad = this.getCantidadProducto(producto.id);
        return {
          productoId: producto.id,
          nombre: producto.nombre,
          cantidad,
          precioUnitario: producto.precio,
          subtotal: producto.precio * cantidad,
        };
      });
  }
  getTotal(): number {
    return this.getItemsPedido().reduce((total, item) => total + item.subtotal, 0);
  }
  limpiarPedido(): void {
    this.cantidades.set({});
    this.cantidadesOriginales.set({});
    this.guardarPedido();
  }
  iniciarEdicion(): void {
    this.cantidadesOriginales.set({ ...this.cantidades() });
  }
  confirmarEdicion(): void {
    this.cantidadesOriginales.set({});
  }
  cancelarEdicion(): void {
    this.cantidades.set({ ...this.cantidadesOriginales() });
    this.cantidadesOriginales.set({});
    this.guardarPedido();
  }
  getCantidadOriginal(productoId: number): number {
    return this.cantidadesOriginales()[productoId] ?? 0;
  }
  hayPedido(): boolean {
    return (
      Object.values(this.cantidades()).some((cantidad) => cantidad > 0) ||
      Object.values(this.cantidadesOriginales()).some((cantidad) => cantidad > 0)
    );
  }
  async guardarProducto(datos: Omit<ProductoCandy, 'id'>, id?: number): Promise<boolean> {
    if (
      !datos.nombre.trim() ||
      !Number.isInteger(datos.precio) ||
      datos.precio <= 0 ||
      !/^https?:\/\//.test(datos.imagenUrl) ||
      !this.getCategorias().some((c) => c.id === datos.categoriaId)
    )
      return false;
    const fila = {
      nombre: datos.nombre.trim(),
      precio: datos.precio,
      imagen_url: datos.imagenUrl.trim(),
      categoria_id: datos.categoriaId,
      activo: datos.activo !== false,
    };
    const tabla = this.supabase.cliente.from('productos_candy');
    const { error } =
      id === undefined ? await tabla.insert(fila) : await tabla.update(fila).eq('id', id);
    if (error)
      throw new Error(
        mensajeServidor(error, 'No se pudo guardar el producto. Intentá nuevamente.'),
      );
    await this.cargar();
    return true;
  }
  async eliminarProducto(id: number): Promise<void> {
    const { error } = await this.supabase.cliente.from('productos_candy').delete().eq('id', id);
    if (error)
      throw new Error(
        error.code === '23503'
          ? 'El producto pertenece a un combo o recompensa. Desactivalos o cambialos antes de eliminarlo.'
          : mensajeServidor(error, 'No se pudo eliminar el producto. Intentá nuevamente.'),
      );
    this.cantidades.update((cantidades) => {
      const nuevas = { ...cantidades };
      delete nuevas[id];
      return nuevas;
    });
    this.guardarPedido();
    await this.cargar();
  }
  async guardarCategoria(nombre: string, id?: number): Promise<boolean> {
    if (!nombre.trim()) return false;
    const tabla = this.supabase.cliente.from('categorias_candy');
    const { error } =
      id === undefined
        ? await tabla.insert({ nombre: nombre.trim() })
        : await tabla.update({ nombre: nombre.trim() }).eq('id', id);
    if (error)
      throw new Error(
        error.code === '23505'
          ? 'Ya existe una categoría con ese nombre. Elegí otro.'
          : mensajeServidor(error, 'No se pudo guardar la categoría. Intentá nuevamente.'),
      );
    await this.cargar();
    return true;
  }
  async eliminarCategoria(id: number): Promise<boolean> {
    const { error } = await this.supabase.cliente.from('categorias_candy').delete().eq('id', id);
    if (error)
      throw new Error(
        error.code === '23503'
          ? 'La categoría tiene productos. Cambialos de categoría primero.'
          : mensajeServidor(error, 'No se pudo eliminar la categoría. Intentá nuevamente.'),
      );
    await this.cargar();
    return true;
  }
  private guardarPedido(): void {
    sessionStorage.setItem('cineplus_pedido', JSON.stringify(this.cantidades()));
  }
  private cargarPedido(): Record<number, number> {
    try {
      const datos: unknown = JSON.parse(sessionStorage.getItem('cineplus_pedido') ?? '{}');
      if (typeof datos !== 'object' || datos === null || Array.isArray(datos)) return {};
      return Object.fromEntries(
        Object.entries(datos).filter(
          ([id, cantidad]) =>
            Number.isInteger(Number(id)) &&
            Number(id) > 0 &&
            Number.isInteger(cantidad) &&
            Number(cantidad) > 0 &&
            Number(cantidad) <= 99,
        ),
      );
    } catch {
      return {};
    }
  }
}
