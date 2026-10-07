import { mensajeServidor } from '../../utils/errores';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { Reportes } from '../../services/reportes';
import { Exportaciones } from '../../services/exportaciones';
import { ReportePeriodo } from '../../models/seguimiento';
import { fechaArgentina, rangoPeriodo } from '../../utils/estrenos';
import { GraficoBarras } from '../../components/grafico-barras/grafico-barras';
import { fechaManualIso, fechaParaMostrar } from '../../utils/fechas';
@Component({
  selector: 'app-admin-reportes',
  imports: [SharedModule, GraficoBarras],
  templateUrl: './admin-reportes.html',
})
export class AdminReportes implements OnInit {
  private reportes = inject(Reportes);
  private exportaciones = inject(Exportaciones);
  fecha = fechaParaMostrar(fechaArgentina());
  periodo: 'dia' | 'semana' | 'mes' = 'dia';
  reporte = signal<ReportePeriodo | undefined>(undefined);
  cargando = signal(false);
  exportando = signal(false);
  mensaje = signal('');
  totales = computed(() =>
    (this.reporte()?.dias ?? []).reduce(
      (a, d) => ({
        compras: a.compras + d.compras,
        entradas: a.entradas + d.entradas,
        facturacion: a.facturacion + d.recaudacion,
        tarjeta: a.tarjeta + (d.cobradoTarjeta ?? 0),
        credito: a.credito + (d.creditoUtilizado ?? 0),
      }),
      { compras: 0, entradas: 0, facturacion: 0, tarjeta: 0, credito: 0 },
    ),
  );
  peliculas = computed(() =>
    (this.reporte()?.peliculas ?? []).map((p) => ({ nombre: p.nombre, valor: p.entradas })),
  );
  productos = computed(() =>
    (this.reporte()?.productos ?? []).map((p) => ({ nombre: p.nombre, valor: p.cantidad })),
  );
  ngOnInit(): void {
    void this.consultar();
  }
  async consultar(): Promise<void> {
    if (this.cargando() || this.exportando()) return;
    const fecha = fechaManualIso(this.fecha);
    if (!fecha) {
      this.reporte.set(undefined);
      this.mensaje.set('Escribí una fecha real: dd/mm/aaaa.');
      return;
    }
    this.cargando.set(true);
    this.reporte.set(undefined);
    this.mensaje.set('');
    try {
      const rango =
        this.periodo === 'dia' ? { desde: fecha, hasta: fecha } : rangoPeriodo(fecha, this.periodo);
      this.reporte.set(await this.reportes.getPeriodo(rango.desde, rango.hasta));
    } catch (error) {
      this.mensaje.set(mensajeServidor(error, 'No se pudo cargar el reporte.'));
    } finally {
      this.cargando.set(false);
    }
  }
  async exportar(formato: 'pdf' | 'excel'): Promise<void> {
    const reporte = this.reporte();
    if (!reporte || this.exportando()) return;
    this.exportando.set(true);
    this.mensaje.set('');
    try {
      await this.exportaciones[formato](reporte);
    } catch {
      this.mensaje.set('No se pudo exportar el reporte. Intentá nuevamente.');
    } finally {
      this.exportando.set(false);
    }
  }
}
