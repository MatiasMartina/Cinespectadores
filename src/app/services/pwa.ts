import { inject, Injectable, OnDestroy, signal } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { Subscription } from 'rxjs';
interface Instalacion extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
@Injectable({ providedIn: 'root' })
export class Pwa implements OnDestroy {
  private actualizaciones = inject(SwUpdate, { optional: true });
  private suscripcion?: Subscription;
  private invitacion?: Instalacion;
  conectado = signal(navigator.onLine);
  nuevaVersion = signal(false);
  instalable = signal(false);
  private conexion = () => this.conectado.set(navigator.onLine);
  private ofrecida = (evento: Event) => {
    evento.preventDefault();
    this.invitacion = evento as Instalacion;
    this.instalable.set(true);
  };
  private instalada = () => {
    this.invitacion = undefined;
    this.instalable.set(false);
  };
  constructor() {
    window.addEventListener('online', this.conexion);
    window.addEventListener('offline', this.conexion);
    window.addEventListener('beforeinstallprompt', this.ofrecida);
    window.addEventListener('appinstalled', this.instalada);
    if (this.actualizaciones?.isEnabled)
      this.suscripcion = this.actualizaciones.versionUpdates.subscribe((evento) => {
        if (evento.type === 'VERSION_READY') this.nuevaVersion.set(true);
      });
  }
  async instalar(): Promise<void> {
    const invitacion = this.invitacion;
    if (!invitacion) return;
    await invitacion.prompt();
    await invitacion.userChoice;
    this.instalada();
  }
  actualizar(): void {
    window.location.reload();
  }
  ngOnDestroy(): void {
    this.suscripcion?.unsubscribe();
    window.removeEventListener('online', this.conexion);
    window.removeEventListener('offline', this.conexion);
    window.removeEventListener('beforeinstallprompt', this.ofrecida);
    window.removeEventListener('appinstalled', this.instalada);
  }
}
