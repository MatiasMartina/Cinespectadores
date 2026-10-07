import { mensajeServidor } from '../../utils/errores';
import { Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { Pelicula } from '../../models/pelicula';
import { Alertas } from '../../services/alertas';
import { Usuarios } from '../../services/usuarios';
import { estadoVenta, sumarDias } from '../../utils/estrenos';
@Component({
  selector: 'app-aviso-estreno',
  imports: [RouterLink],
  templateUrl: './aviso-estreno.html',
})
export class AvisoEstreno {
  pelicula = input.required<Pelicula>();
  private alertas = inject(Alertas);
  private usuarios = inject(Usuarios);
  usuario = toSignal(this.usuarios.usuarioActual$, { initialValue: undefined });
  activa = computed(() => this.alertas.peliculas().includes(this.pelicula().id));
  estado = computed(() => estadoVenta(this.pelicula()));
  procesando = signal(false);
  mensaje = signal('');
  get inicioPreventa(): string {
    return sumarDias(this.pelicula().fechaEstreno!, -(this.pelicula().diasPreventa ?? 7));
  }
  async cambiar(): Promise<void> {
    if (this.procesando()) return;
    this.procesando.set(true);
    try {
      if (this.activa()) await this.alertas.desactivar(this.pelicula().id);
      else await this.alertas.activar(this.pelicula().id);
      this.mensaje.set(
        this.activa() ? 'Te avisaremos cuando haya entradas disponibles.' : 'Alerta desactivada.',
      );
    } catch (error) {
      this.mensaje.set(mensajeServidor(error, 'No se pudo actualizar la alerta.'));
    } finally {
      this.procesando.set(false);
    }
  }
}
