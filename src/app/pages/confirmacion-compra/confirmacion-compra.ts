import { mensajeServidor } from '../../utils/errores';
import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Funcion } from '../../models/funcion';
import { Pelicula } from '../../models/pelicula';
import { Butacas } from '../../services/butacas';
import { CandyBar } from '../../services/candy-bar';
import { Compra } from '../../services/compra';
import { Cotizaciones } from '../../services/cotizaciones';
import { Peliculas } from '../../services/peliculas';
import { SalidaCompra } from '../../services/salida-compra';

interface ItemCandyConfirmacion {
  nombre: string;
  cantidad: number;
  precio: number;
  subtotal: number;
}

interface ButacaConfirmacion {
  id: string;
  tipo: 'comun' | 'vip' | 'accesible';
  etiqueta: string;
}

@Component({
  selector: 'app-confirmacion-compra',
  imports: [RouterLink],
  templateUrl: './confirmacion-compra.html',
  styleUrl: './confirmacion-compra.css',
})
export class ConfirmacionCompra implements OnInit {
  private router = inject(Router);
  private compraService = inject(Compra);
  private peliculasService = inject(Peliculas);
  private butacasService = inject(Butacas);
  private candyBarService = inject(CandyBar);
  private cotizaciones = inject(Cotizaciones);
  private salidaCompra = inject(SalidaCompra);
  cargando = signal(true);
  mensaje = signal('');
  totalConBeneficios = 0;
  ahorroCombo = 0;
  descuentoCanjes = 0;
  descuentoPromocion = 0;

  funcion?: Funcion;
  pelicula = signal<Pelicula | undefined>(undefined);
  butacasSeleccionadas: string[] = [];
  butacasDetalle: ButacaConfirmacion[] = [];
  compraFinalizada = false;
  totalCandyBar = 0;
  itemsCandyBar: ItemCandyConfirmacion[] = [];

  async ngOnInit(): Promise<void> {
    const funcionPendiente = this.compraService.getFuncionPendiente();

    if (funcionPendiente) {
      this.router.navigate(['/funcion', funcionPendiente.id, 'butacas'], {
        queryParams: { editar: true },
      });

      return;
    }
    this.funcion = this.compraService.getFuncion();
    this.butacasSeleccionadas = this.compraService.getButacasSeleccionadas();

    try {
      await this.cotizaciones.cargar();
      const todasLasButacas = this.butacasService.getButacas(this.funcion?.salaNumero);

      this.butacasDetalle = this.butacasSeleccionadas.map((id): ButacaConfirmacion => {
        const butaca = todasLasButacas.find((b) => b.id === id);

        if (butaca?.tipo === 'VIP') {
          return { id, tipo: 'vip', etiqueta: 'VIP' };
        }

        if (butaca?.tipo === 'Accesible') {
          return { id, tipo: 'accesible', etiqueta: 'Accesible' };
        }

        return { id, tipo: 'comun', etiqueta: 'Común' };
      });

      this.totalCandyBar = this.candyBarService.getTotal();
      if (this.funcion) {
        const precio = this.cotizaciones.calcular(this.funcion, this.butacasSeleccionadas);
        this.totalConBeneficios = precio.total;
        this.totalCandyBar = precio.productosCandy.reduce((t, i) => t + i.subtotal, 0);
        this.ahorroCombo = precio.ahorroCombo;
        this.descuentoCanjes = precio.descuentoCanjes;
        this.descuentoPromocion = Math.max(precio.descuentoCupon, precio.descuentoPrimeraCompra);
        this.itemsCandyBar = precio.productosCandy.map((i) => ({
          nombre: i.nombre,
          cantidad: i.cantidad,
          precio: i.precioUnitario,
          subtotal: i.subtotal,
        }));
      }
      if (this.funcion) {
        const peliculaEncontrada = await this.peliculasService.getPeliculaPorIdDesdeSupabase(
          this.funcion.peliculaId,
        );
        this.pelicula.set(peliculaEncontrada);
      }
    } catch (error) {
      this.mensaje.set(mensajeServidor(error, 'No se pudo cargar el resumen.'));
    } finally {
      this.cargando.set(false);
    }
  }

  getTotalEntradas(): number {
    if (!this.funcion) {
      return 0;
    }

    return this.butacasService.calcularTotal(
      this.funcion.precio,
      this.butacasSeleccionadas,
      this.funcion.salaNumero,
    );
  }

  getTotalCandyBar(): number {
    return this.totalCandyBar;
  }

  getTotalFinal(): number {
    return this.totalConBeneficios;
  }

  finalizarCompra(): void {
    if (!this.funcion || this.butacasSeleccionadas.length === 0) return;
    this.router.navigate(['/pago']);
  }

  cancelarCompra(): void {
    if (!this.salidaCompra.cancelarCompra(this)) return;
    this.router.navigate(['/']);
  }
}
