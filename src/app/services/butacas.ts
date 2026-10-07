import { inject, Injectable } from '@angular/core';
import { Butaca } from '../models/butaca';
import { FilaButacas } from '../models/fila-butacas';
import { Salas } from './salas';
import { Configuracion } from './configuracion';
import { Supabase } from './supabase';

interface ButacaOcupadaSupabase {
  butaca_id: string;
}

@Injectable({ providedIn: 'root' })
export class Butacas {
  private salas = inject(Salas);
  private configuracion = inject(Configuracion);
  private supabase = inject(Supabase);

  getButacas(salaNumero = 1): Butaca[] {
    return this.salas.getSala(salaNumero)?.butacas ?? [];
  }

  getFilasButacas(salaNumero = 1): FilaButacas[] {
    const filas: FilaButacas[] = [];

    for (const butaca of this.getButacas(salaNumero)) {
      let fila = filas.find((fila) => fila.nombre === butaca.fila);

      if (!fila) {
        fila = {
          nombre: butaca.fila,
          butacas: [],
        };

        filas.push(fila);
      }

      fila.butacas.push(butaca);
    }

    return filas;
  }

  async cargarSalasYPrecios(): Promise<void> {
    await Promise.all([this.salas.cargar(), this.configuracion.cargar()]);
  }

  async getButacasOcupadasDesdeSupabase(funcionId: number): Promise<string[]> {
    const { data, error } = await this.supabase.cliente
      .from('butacas_ocupadas')
      .select('butaca_id')
      .eq('funcion_id', funcionId);

    if (error) {
      console.error('Error al obtener las butacas ocupadas:', error);

      throw new Error('No se pudo consultar la disponibilidad. Intentá nuevamente.');
    }

    return (data as ButacaOcupadaSupabase[]).map((registro) => registro.butaca_id);
  }

  calcularTotal(precioBase: number, seleccionadas: string[], salaNumero = 1): number {
    const butacas = this.getButacas(salaNumero);
    const extra = this.getPrecioExtraVip();

    return seleccionadas.reduce((total, id) => {
      const butaca = butacas.find((butaca) => butaca.id === id && butaca.habilitada !== false);

      return total + (butaca ? precioBase + (butaca.tipo === 'VIP' ? extra : 0) : 0);
    }, 0);
  }

  getPrecioButaca(precioBase: number, id: string, salaNumero = 1): number {
    const butaca = this.getButacas(salaNumero).find((butaca) => butaca.id === id);

    if (!butaca || butaca.habilitada === false) {
      return 0;
    }

    return precioBase + (butaca.tipo === 'VIP' ? this.getPrecioExtraVip() : 0);
  }

  getPrecioExtraVip(): number {
    return this.configuracion.getConfiguracion().extraVip;
  }

  escucharButacasOcupadas(funcionId: number, alCambiar: () => void): () => void {
    const canal = this.supabase.cliente
      .channel(`butacas-funcion-${funcionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'butacas_ocupadas',
          filter: `funcion_id=eq.${funcionId}`,
        },
        () => alCambiar(),
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'butacas_ocupadas' },
        () => alCambiar(),
      )
      .subscribe((estado) => {
        if (estado === 'SUBSCRIBED') alCambiar();
      });

    return () => {
      void this.supabase.cliente.removeChannel(canal);
    };
  }
}
