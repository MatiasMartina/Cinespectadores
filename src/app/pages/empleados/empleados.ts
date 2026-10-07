import { mensajeServidor } from '../../utils/errores';
import { Component, computed, inject, signal } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { LectorQr } from '../../components/lector-qr/lector-qr';
import { MapaButacas } from '../../components/mapa-butacas/mapa-butacas';
import { Venta, SectorValidacion } from '../../models/venta';
import { Ventas } from '../../services/ventas';
import { Butacas } from '../../services/butacas';
import { FilaButacas } from '../../models/fila-butacas';

@Component({
  selector: 'app-empleados',
  imports: [SharedModule, LectorQr, MapaButacas],
  templateUrl: './empleados.html',
  styleUrl: './empleados.css',
})
export class Empleados {
  private ventas = inject(Ventas);
  private butacas = inject(Butacas);
  sector: SectorValidacion = 'cine';
  codigo = '';
  venta = signal<Venta | undefined>(undefined);
  mensaje = signal('');
  error = signal(false);
  procesando = signal(false);
  filasButacas = computed<FilaButacas[]>(() => {
    const venta = this.venta();
    return venta ? this.butacas.getFilasButacas(Number(venta.entrada.salaNumero)) : [];
  });
  ubicaciones = computed(() => {
    const butacas = this.filasButacas().flatMap((fila) => fila.butacas);
    return (this.venta()?.entrada.butacas ?? []).map((id) => {
      const butaca = butacas.find((actual) => actual.id === id);
      return {
        id,
        detalle: butaca ? `Fila ${butaca.fila} · Butaca ${butaca.numero}` : `Butaca ${id}`,
        tipo: butaca?.tipo,
      };
    });
  });

  cambiarSector(sector: SectorValidacion): void {
    if (this.procesando()) return;
    this.sector = sector;
    this.venta.set(undefined);
    this.codigo = '';
    this.error.set(false);
    this.mensaje.set('');
  }

  limpiarBusqueda(): void {
    if (this.procesando()) return;
    this.venta.set(undefined);
    this.error.set(false);
    this.mensaje.set('');
  }

  leerCodigo(texto: string): void {
    if (this.procesando()) return;
    this.codigo = texto;
    void this.buscar();
  }

  async buscar(): Promise<void> {
    if (this.procesando()) return;
    this.venta.set(undefined);
    if (!this.codigo.trim()) {
      this.error.set(true);
      this.mensaje.set('Ingresá un código para buscar la compra.');
      return;
    }
    this.procesando.set(true);
    this.error.set(false);
    this.mensaje.set('Buscando compra…');
    try {
      const encontrada = await this.ventas.buscarCodigo(this.codigo);
      if (encontrada?.entrada.soloCandy) this.sector = 'candy';
      if (encontrada && this.sector === 'cine') await this.butacas.cargarSalasYPrecios();
      this.venta.set(encontrada);
      this.error.set(!encontrada);
      if (encontrada) {
        this.codigo = encontrada.entrada.codigo;
        this.error.set(!!encontrada.cancelacion);
        this.mensaje.set(
          encontrada.cancelacion
            ? 'Esta compra fue cancelada. Su QR no puede utilizarse.'
            : 'Revisá los datos antes de confirmar.',
        );
      } else {
        this.mensaje.set('El código no pertenece a una compra registrada.');
      }
    } catch (error) {
      this.error.set(true);
      this.mensaje.set(
        mensajeServidor(error, 'No se pudo consultar la compra. Intentá nuevamente.'),
      );
    } finally {
      this.procesando.set(false);
    }
  }

  get yaUtilizado(): boolean {
    const venta = this.venta();
    return !!(venta?.cancelacion || (this.sector === 'cine' ? venta?.ingreso : venta?.candy));
  }

  async validar(): Promise<void> {
    const venta = this.venta();
    if (
      this.procesando() ||
      !venta ||
      this.yaUtilizado ||
      (this.sector === 'candy' && venta.entrada.productosCandy.length === 0)
    )
      return;
    this.procesando.set(true);
    this.error.set(false);
    try {
      const resultado = await this.ventas.validarCodigo(venta.entrada.codigo, this.sector);
      this.error.set(!resultado.valido);
      if (resultado.venta) this.venta.set(resultado.venta);
      this.mensaje.set(resultado.mensaje);
    } catch {
      this.error.set(true);
      this.mensaje.set('No se pudo guardar la validación. Intentá nuevamente.');
    } finally {
      this.procesando.set(false);
    }
  }
}
