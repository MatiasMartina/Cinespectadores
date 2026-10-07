import { mensajeServidor } from '../utils/errores';
import { inject, Injectable } from '@angular/core';
import { Supabase } from './supabase';
import { ReportePeriodo } from '../models/seguimiento';
import { ReporteDiario } from '../models/beneficios';
@Injectable({ providedIn: 'root' })
export class Reportes {
  private supabase = inject(Supabase);
  async getPeriodo(desde: string, hasta: string): Promise<ReportePeriodo> {
    const { data, error } = await this.supabase.cliente.rpc('reporte_periodo', {
      p_desde: desde,
      p_hasta: hasta,
    });
    if (error)
      throw new Error(mensajeServidor(error, 'No se pudo cargar el reporte. Intentá nuevamente.'));
    return data as ReportePeriodo;
  }
  async getDiario(fecha: string): Promise<ReporteDiario> {
    const { data, error } = await this.supabase.cliente.rpc('reporte_diario', { p_fecha: fecha });
    if (error)
      throw new Error(
        mensajeServidor(error, 'No se pudo cargar el reporte diario. Intentá nuevamente.'),
      );
    return data as ReporteDiario;
  }
}
