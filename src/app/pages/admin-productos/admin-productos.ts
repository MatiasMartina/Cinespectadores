import { mensajeServidor } from '../../utils/errores';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { CampoFormulario, DatosFormulario } from '../../models/campo-formulario';
import { ProductoCandy } from '../../models/producto-candy';
import { CategoriaCandy } from '../../models/categoria-candy';
import { CandyBar } from '../../services/candy-bar';
import { Administracion } from '../../services/administracion';

@Component({
  selector: 'app-admin-productos',
  imports: [SharedModule],
  templateUrl: './admin-productos.html',
})
export class AdminProductos implements OnInit {
  seccion = signal<'productos' | 'categorias'>('productos');
  cargando = signal(true);
  procesando = signal(false);
  private candy = inject(CandyBar);
  private admin = inject(Administracion);
  get productos() {
    return this.candy.getTodosLosProductos();
  }
  get categorias() {
    return this.candy.getCategorias();
  }
  editandoId?: number;
  valores: DatosFormulario = { activo: true };
  categoriaId?: number;
  nombreCategoria = '';
  mensaje = signal('');
  error = signal(false);
  busqueda = signal('');
  categoriaFiltro = signal('');
  disponibilidad = signal('');
  filtrados = computed(() =>
    this.productos.filter(
      (p) =>
        p.nombre.toLocaleLowerCase('es').includes(this.busqueda().trim().toLocaleLowerCase('es')) &&
        (!this.categoriaFiltro() || p.categoriaId === Number(this.categoriaFiltro())) &&
        (!this.disponibilidad() ||
          (p.activo !== false) === (this.disponibilidad() === 'disponible')),
    ),
  );
  async ngOnInit(): Promise<void> {
    try {
      await Promise.all([this.candy.cargar()]);
      this.actualizarCampos();
    } catch (error) {
      this.error.set(true);
      this.mensaje.set(mensajeServidor(error, 'No se pudieron cargar los datos.'));
    } finally {
      this.cargando.set(false);
    }
  }
  campos: CampoFormulario[] = [];

  constructor() {
    this.actualizarCampos();
  }
  private actualizarCampos(): void {
    this.campos = [
      { nombre: 'nombre', etiqueta: 'Nombre', tipo: 'text', requerido: true, maximo: 100 },
      {
        nombre: 'precio',
        etiqueta: 'Precio',
        tipo: 'number',
        entero: true,
        requerido: true,
        minimo: 1,
      },
      { nombre: 'imagenUrl', etiqueta: 'URL de la imagen', tipo: 'text', requerido: true },
      {
        nombre: 'categoriaId',
        etiqueta: 'Categoría',
        tipo: 'select',
        requerido: true,
        opciones: this.categorias.map((categoria) => ({
          valor: categoria.id,
          etiqueta: categoria.nombre,
        })),
      },
      { nombre: 'activo', etiqueta: 'Disponible para comprar', tipo: 'checkbox' },
    ];
  }
  editar(producto: ProductoCandy): void {
    this.editandoId = producto.id;
    this.valores = { ...producto, activo: producto.activo !== false };
  }
  cancelar(): void {
    this.editandoId = undefined;
    this.valores = { activo: true };
  }
  async guardar(datos: DatosFormulario): Promise<void> {
    if (this.procesando()) return;
    this.procesando.set(true);
    try {
      const error = await this.admin.guardarProducto(
        {
          nombre: String(datos['nombre']).trim(),
          precio: Number(datos['precio']),
          imagenUrl: String(datos['imagenUrl']).trim(),
          categoriaId: Number(datos['categoriaId']),
          activo: datos['activo'] === true,
        },
        this.editandoId,
      );
      this.mostrar(error, 'Producto guardado.');
      if (!error) this.cancelar();
    } catch (error) {
      this.error.set(true);
      this.mensaje.set(mensajeServidor(error, 'No se pudo guardar el cambio.'));
    } finally {
      this.procesando.set(false);
    }
  }
  async eliminar(producto: ProductoCandy): Promise<void> {
    if (this.procesando()) return;
    this.procesando.set(true);
    try {
      if (!confirm(`¿Eliminar ${producto.nombre}? Las compras anteriores conservarán el producto.`))
        return;
      this.mostrar(await this.admin.eliminarProducto(producto.id), 'Producto eliminado.');
    } catch (error) {
      this.error.set(true);
      this.mensaje.set(mensajeServidor(error, 'No se pudo guardar el cambio.'));
    } finally {
      this.procesando.set(false);
    }
  }
  getCategoria(id: number): string {
    return this.categorias.find((categoria) => categoria.id === id)?.nombre ?? '';
  }
  editarCategoria(categoria: CategoriaCandy): void {
    this.categoriaId = categoria.id;
    this.nombreCategoria = categoria.nombre;
  }
  async guardarCategoria(): Promise<void> {
    if (this.procesando()) return;
    this.procesando.set(true);
    try {
      const error = await this.admin.guardarCategoria(this.nombreCategoria, this.categoriaId);
      this.mostrar(error, 'Categoría guardada.');
      if (!error) {
        this.categoriaId = undefined;
        this.nombreCategoria = '';
        this.actualizarCampos();
      }
    } catch (error) {
      this.error.set(true);
      this.mensaje.set(mensajeServidor(error, 'No se pudo guardar el cambio.'));
    } finally {
      this.procesando.set(false);
    }
  }
  async eliminarCategoria(categoria: CategoriaCandy): Promise<void> {
    if (this.procesando()) return;
    this.procesando.set(true);
    try {
      if (!confirm(`¿Eliminar la categoría ${categoria.nombre}?`)) return;
      this.mostrar(await this.admin.eliminarCategoria(categoria.id), 'Categoría eliminada.');
      this.actualizarCampos();
    } catch (error) {
      this.error.set(true);
      this.mensaje.set(mensajeServidor(error, 'No se pudo guardar el cambio.'));
    } finally {
      this.procesando.set(false);
    }
  }
  private mostrar(error: string, exito: string): void {
    this.error.set(!!error);
    this.mensaje.set(error || exito);
  }
}
