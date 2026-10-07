import { mensajeServidor } from '../../utils/errores';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ProductoCandy } from '../../models/producto-candy';
import { CandyBar } from '../../services/candy-bar';
import { Compra } from '../../services/compra';
import { CategoriaCandy } from '../../models/categoria-candy';
import { SalidaCompra } from '../../services/salida-compra';

@Component({
  selector: 'app-candy-bar',
  imports: [RouterLink],
  templateUrl: './candy-bar.html',
  styleUrl: './candy-bar.css',
})
export class CandyBarPage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private candyBarService = inject(CandyBar);
  private compraService = inject(Compra);
  private salidaCompra = inject(SalidaCompra);

  get productos(): ProductoCandy[] {
    return this.candyBarService.getProductos();
  }
  cargando = signal(true);
  mensaje = signal('');

  get categorias(): CategoriaCandy[] {
    return this.candyBarService.getCategorias();
  }
  categoriaSeleccionada: number | null = null;

  get productosFiltrados(): ProductoCandy[] {
    if (this.categoriaSeleccionada === null) {
      return this.productos;
    }

    return this.productos.filter((producto) => producto.categoriaId === this.categoriaSeleccionada);
  }

  seleccionarCategoria(id: number | null): void {
    this.categoriaSeleccionada = id;
  }

  modoEdicion = this.route.snapshot.queryParamMap.get('editar') === 'true';

  get funcionId(): number | undefined {
    return this.compraService.getFuncion()?.id;
  }

  get puedeContinuar(): boolean {
    return !!this.funcionId && this.compraService.getButacasSeleccionadas().length > 0;
  }

  async ngOnInit(): Promise<void> {
    try {
      await this.candyBarService.cargar();
    } catch (error) {
      this.mensaje.set(mensajeServidor(error, 'No se pudo cargar el Candy Bar.'));
    } finally {
      this.cargando.set(false);
    }
    if (this.modoEdicion) {
      this.candyBarService.iniciarEdicion();
    }
  }

  aceptarCambios(): void {
    if (this.modoEdicion) {
      this.candyBarService.confirmarEdicion();
    }
  }

  descartarCambios(): void {
    this.candyBarService.cancelarEdicion();
  }

  vaciarCarrito(): void {
    this.candyBarService.limpiarPedido();
  }

  cancelarCompra(): void {
    if (!this.salidaCompra.cancelarCompra(this)) return;
    void this.router.navigate(['/']);
  }

  getCantidadNueva(producto: ProductoCandy): number {
    if (!this.modoEdicion) {
      return 0;
    }

    return Math.max(
      0,
      this.candyBarService.getCantidadProducto(producto.id) -
        this.candyBarService.getCantidadOriginal(producto.id),
    );
  }

  agregarProducto(producto: ProductoCandy): void {
    this.candyBarService.agregarProducto(producto.id);
  }

  quitarProducto(producto: ProductoCandy): void {
    this.candyBarService.quitarProducto(producto.id);
  }

  getCantidadProducto(producto: ProductoCandy): number {
    return this.candyBarService.getCantidadProducto(producto.id);
  }

  getCantidadTotal(): number {
    return this.candyBarService.getCantidadTotal();
  }

  getTotal(): number {
    return this.candyBarService.getTotal();
  }
}
