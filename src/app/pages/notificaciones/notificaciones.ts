import { mensajeServidor } from '../../utils/errores';
import { Component, inject, signal } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { Alertas } from '../../services/alertas';
@Component({
  selector: 'app-notificaciones',
  imports: [SharedModule],
  templateUrl: './notificaciones.html',
})
export class Notificaciones {
  alertas = inject(Alertas);
  procesando = signal(false);
  mensaje = signal('');
  constructor() {
    void this.actualizar();
  }
  async actualizar(): Promise<void> {
    this.procesando.set(true);
    await this.alertas.actualizar();
    this.procesando.set(false);
  }
  async leer(id: number): Promise<void> {
    try {
      await this.alertas.marcarLeida(id);
    } catch (error) {
      this.mensaje.set(mensajeServidor(error, 'No se pudo marcar el aviso.'));
    }
  }
}
