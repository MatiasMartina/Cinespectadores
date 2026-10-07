import { mensajeServidor } from '../../utils/errores';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { Ventas } from '../../services/ventas';
import { Entradas } from '../../services/entradas';
import { Venta } from '../../models/venta';
import { puedeCancelar, yaVista } from '../../utils/estrenos';
@Component({
  selector: 'app-mis-peliculas',
  imports: [SharedModule],
  templateUrl: './mis-peliculas.html',
})
export class MisPeliculas implements OnInit {
  private ventas = inject(Ventas);
  private entradas = inject(Entradas);
  compras = signal<Venta[]>([]);
  filtro = signal<'vistas' | 'proximas' | 'canceladas'>('vistas');
  filtradas = computed(() =>
    this.compras().filter((v) =>
      this.filtro() === 'canceladas'
        ? !!v.cancelacion
        : this.filtro() === 'vistas'
          ? yaVista(v)
          : !v.cancelacion && !yaVista(v),
    ),
  );
  cargando = signal(true);
  procesando = signal(false);
  mensaje = signal('');
  error = signal(false);
  puedeCancelar = puedeCancelar;
  async ngOnInit(): Promise<void> {
    await this.actualizar();
  }
  async actualizar(): Promise<void> {
    if (this.procesando()) return;
    this.cargando.set(true);
    this.mensaje.set('');
    this.error.set(false);
    try {
      this.compras.set(await this.ventas.getMisCompras());
    } catch (error) {
      this.error.set(true);
      this.mensaje.set(mensajeServidor(error, 'No se pudo cargar tu historial.'));
    } finally {
      this.cargando.set(false);
    }
  }
  async cancelar(venta: Venta): Promise<void> {
    if (this.procesando() || !puedeCancelar(venta)) return;
    if (
      !confirm(
        `¿Cancelar esta compra? Se acreditarán $${venta.entrada.total.toLocaleString('es-AR')} en tu cuenta y se liberarán las butacas. Los puntos y canjes de esta compra se revierten.`,
      )
    )
      return;
    this.procesando.set(true);
    try {
      const cancelada = await this.ventas.cancelarCompra(venta.entrada.codigo);
      this.compras.update((lista) =>
        lista.map((v) =>
          v.entrada.codigo === cancelada.entrada.codigo ? { ...v, ...cancelada } : v,
        ),
      );
      this.error.set(false);
      this.mensaje.set(
        `Compra cancelada. Tenés $${cancelada.cancelacion!.credito.toLocaleString('es-AR')} más de crédito para futuras compras.`,
      );
    } catch (error) {
      this.error.set(true);
      this.mensaje.set(mensajeServidor(error, 'No se pudo cancelar la compra.'));
    } finally {
      this.procesando.set(false);
    }
  }
  async descargar(venta: Venta): Promise<void> {
    if (venta.cancelacion || this.procesando()) return;
    this.procesando.set(true);
    try {
      await this.entradas.descargarEntrada(venta.entrada);
    } catch {
      this.error.set(true);
      this.mensaje.set('No se pudo generar el PDF. Intentá nuevamente.');
    } finally {
      this.procesando.set(false);
    }
  }
}
