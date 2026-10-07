import { mensajeServidor } from '../../utils/errores';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { Supabase } from '../../services/supabase';
import { Actividad } from '../../models/seguimiento';
import { fechaArgentina, sumarDias } from '../../utils/estrenos';
import { fechaManualIso, fechaParaMostrar } from '../../utils/fechas';
@Component({
  selector: 'app-admin-actividad',
  imports: [SharedModule],
  templateUrl: './admin-actividad.html',
})
export class AdminActividad implements OnInit {
  private supabase = inject(Supabase);
  desde = fechaParaMostrar(sumarDias(fechaArgentina(), -6));
  hasta = fechaParaMostrar(fechaArgentina());
  texto = signal('');
  registros = signal<Actividad[]>([]);
  filtrados = computed(() =>
    this.registros().filter((a) =>
      `${a.autor} ${a.accion} ${a.entidad} ${a.referencia}`
        .toLocaleLowerCase('es')
        .includes(this.texto().toLocaleLowerCase('es').trim()),
    ),
  );
  cargando = signal(false);
  mensaje = signal('');
  ngOnInit(): void {
    void this.consultar();
  }
  async consultar(): Promise<void> {
    if (this.cargando()) return;
    const desde = fechaManualIso(this.desde),
      hasta = fechaManualIso(this.hasta);
    if (!desde || !hasta || hasta < desde) {
      this.registros.set([]);
      this.mensaje.set('Escribí fechas reales en dd/mm/aaaa y un período ordenado.');
      return;
    }
    this.cargando.set(true);
    this.mensaje.set('');
    try {
      const { data, error } = await this.supabase.cliente
        .from('actividad')
        .select('*')
        .gte('fecha', `${desde}T00:00:00-03:00`)
        .lt('fecha', `${sumarDias(hasta, 1)}T00:00:00-03:00`)
        .order('fecha', { ascending: false })
        .limit(500);
      if (error)
        throw new Error(
          mensajeServidor(error, 'No se pudo cargar la actividad. Intentá nuevamente.'),
        );
      this.registros.set(data as Actividad[]);
    } catch (error) {
      this.registros.set([]);
      this.mensaje.set(mensajeServidor(error, 'No se pudo cargar la actividad.'));
    } finally {
      this.cargando.set(false);
    }
  }
  cambios(registro: Actividad): string {
    const antes = registro.detalle.anterior ?? {},
      despues = registro.detalle.actual ?? {};
    return (
      Object.keys(despues)
        .filter((k) => JSON.stringify(antes[k]) !== JSON.stringify(despues[k]))
        .map((k) => `${k}: ${JSON.stringify(antes[k] ?? '—')} → ${JSON.stringify(despues[k])}`)
        .join(' · ') || 'Operación registrada.'
    );
  }
}
