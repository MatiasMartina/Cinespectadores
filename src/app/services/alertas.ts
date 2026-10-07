import { mensajeServidor } from '../utils/errores';
import { Injectable, inject, OnDestroy, signal, computed } from '@angular/core';
import { Subscription } from 'rxjs';
import { Supabase } from './supabase';
import { Usuarios } from './usuarios';
import { Notificacion } from '../models/seguimiento';

@Injectable({ providedIn: 'root' })
export class Alertas implements OnDestroy {
  private supabase = inject(Supabase);
  private usuarios = inject(Usuarios);
  private suscripcion: Subscription;
  private temporizador?: ReturnType<typeof setInterval>;
  private dejarCanal?: () => void;
  private revision = 0;
  private consultando = false;
  private emitidas = new Set<number>();
  notificaciones = signal<Notificacion[]>([]);
  peliculas = signal<number[]>([]);
  mensaje = signal('');
  pendientes = computed(() => this.notificaciones().filter((n) => !n.leida).length);

  constructor() {
    let anterior: string | undefined;
    this.suscripcion = this.usuarios.usuarioActual$.subscribe((usuario) => {
      if (anterior === usuario?.authId) return;
      anterior = usuario?.authId;
      this.revision++;
      this.consultando = false;
      clearInterval(this.temporizador);
      this.dejarCanal?.();
      this.notificaciones.set([]);
      this.peliculas.set([]);
      this.emitidas.clear();
      this.mensaje.set('');
      if (!usuario) return;
      void this.actualizar();
      this.temporizador = setInterval(() => {
        if (document.visibilityState === 'visible') void this.actualizar();
      }, 60000);
      const canal = this.supabase.cliente
        .channel('avisos-' + usuario.authId)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notificaciones',
            filter: `auth_id=eq.${usuario.authId}`,
          },
          () => {
            void this.actualizar();
          },
        )
        .subscribe();
      this.dejarCanal = () => {
        void this.supabase.cliente.removeChannel(canal);
      };
    });
  }
  async actualizar(): Promise<void> {
    const usuario = this.usuarios.getUsuarioActual();
    if (!usuario || this.consultando) return;
    const revision = this.revision;
    this.consultando = true;
    try {
      const refresco = await this.supabase.cliente.rpc('refrescar_mis_alertas');
      if (refresco.error)
        throw new Error(
          mensajeServidor(
            refresco.error,
            'No se pudieron actualizar tus avisos. Intentá nuevamente.',
          ),
        );
      const [avisos, alertas] = await Promise.all([
        this.supabase.cliente
          .from('notificaciones')
          .select('*')
          .order('fecha', { ascending: false }),
        this.supabase.cliente
          .from('alertas_peliculas')
          .select('pelicula_id')
          .eq('auth_id', usuario.authId),
      ]);
      if (avisos.error || alertas.error) throw new Error('No se pudieron consultar tus alertas.');
      if (revision !== this.revision) return;
      const lista: Notificacion[] = avisos.data.map((n) => ({
        id: n.id,
        peliculaId: n.pelicula_id,
        titulo: n.titulo,
        mensaje: n.mensaje,
        fecha: n.fecha,
        leida: n.leida,
      }));
      this.notificaciones.set(lista);
      this.peliculas.set(alertas.data.map((a) => a.pelicula_id));
      this.mensaje.set('');
      for (const aviso of lista) {
        if (
          !aviso.leida &&
          !this.emitidas.has(aviso.id) &&
          typeof Notification !== 'undefined' &&
          Notification.permission === 'granted'
        ) {
          void this.mostrarAviso(aviso);
        }
        this.emitidas.add(aviso.id);
      }
    } catch (error) {
      if (revision === this.revision)
        this.mensaje.set(mensajeServidor(error, 'No se pudieron cargar los avisos.'));
    } finally {
      if (revision === this.revision) this.consultando = false;
    }
  }
  private async mostrarAviso(aviso: Notificacion): Promise<void> {
    const opciones = {
      body: aviso.mensaje,
      icon: new URL('icons/icon-192.png', document.baseURI).toString(),
      tag: 'pelicula-' + aviso.peliculaId,
    };
    try {
      const registro = await navigator.serviceWorker?.getRegistration();
      if (registro) await registro.showNotification(aviso.titulo, opciones);
      else new Notification(aviso.titulo, opciones);
    } catch {
      /* El aviso queda disponible en la bandeja de la cuenta. */
    }
  }
  async activar(peliculaId: number): Promise<void> {
    const usuario = this.usuarios.getUsuarioActual();
    if (!usuario) throw new Error('Iniciá sesión para activar una alerta.');
    const { error } = await this.supabase.cliente
      .from('alertas_peliculas')
      .upsert(
        { auth_id: usuario.authId, pelicula_id: peliculaId },
        { onConflict: 'auth_id,pelicula_id', ignoreDuplicates: true },
      );
    if (error)
      throw new Error(mensajeServidor(error, 'No se pudo activar el aviso. Intentá nuevamente.'));
    this.peliculas.update((ids) => [...new Set([...ids, peliculaId])]);
    if (typeof Notification !== 'undefined' && Notification.permission === 'default')
      await Notification.requestPermission();
    await this.actualizar();
  }
  async desactivar(peliculaId: number): Promise<void> {
    const usuario = this.usuarios.getUsuarioActual();
    if (!usuario) return;
    const { error } = await this.supabase.cliente
      .from('alertas_peliculas')
      .delete()
      .eq('auth_id', usuario.authId)
      .eq('pelicula_id', peliculaId);
    if (error)
      throw new Error(
        mensajeServidor(error, 'No se pudo desactivar el aviso. Intentá nuevamente.'),
      );
    this.peliculas.update((ids) => ids.filter((id) => id !== peliculaId));
  }
  async marcarLeida(id: number): Promise<void> {
    const { error } = await this.supabase.cliente
      .from('notificaciones')
      .update({ leida: true })
      .eq('id', id);
    if (error)
      throw new Error(
        mensajeServidor(error, 'No se pudo marcar el aviso como leído. Intentá nuevamente.'),
      );
    this.notificaciones.update((lista) =>
      lista.map((n) => (n.id === id ? { ...n, leida: true } : n)),
    );
  }
  ngOnDestroy(): void {
    this.revision++;
    this.suscripcion.unsubscribe();
    clearInterval(this.temporizador);
    this.dejarCanal?.();
  }
}
