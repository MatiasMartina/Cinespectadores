import { mensajeServidor } from '../utils/errores';
import { inject, Injectable, signal } from '@angular/core';
import { Supabase } from './supabase';
@Injectable({ providedIn: 'root' })
export class Configuracion {
  private supabase = inject(Supabase);
  private datos = signal<{ porcentajePrimeraCompra: number; extraVip: number } | undefined>(
    undefined,
  );
  getConfiguracion() {
    return this.datos() ?? { porcentajePrimeraCompra: 0, extraVip: 0 };
  }
  async cargar(): Promise<void> {
    const { data, error } = await this.supabase.cliente
      .from('configuracion')
      .select('*')
      .eq('id', 1)
      .single();
    if (error) throw new Error('No se pudo cargar la configuración de precios.');
    this.datos.set({
      porcentajePrimeraCompra: Number(data.porcentaje_primera_compra),
      extraVip: Number(data.extra_vip),
    });
  }
  async guardar(porcentaje: number, extraVip: number): Promise<boolean> {
    if (
      !Number.isFinite(porcentaje) ||
      porcentaje < 0 ||
      porcentaje > 100 ||
      !Number.isInteger(extraVip) ||
      extraVip < 0
    )
      return false;
    const { error } = await this.supabase.cliente
      .from('configuracion')
      .update({ porcentaje_primera_compra: porcentaje, extra_vip: extraVip })
      .eq('id', 1);
    if (error)
      throw new Error(
        mensajeServidor(error, 'No se pudo guardar la configuración. Intentá nuevamente.'),
      );
    await this.cargar();
    return true;
  }
}
