import { mensajeServidor } from '../../utils/errores';
import { Component, inject, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { SharedModule } from '../../shared/shared.module';
import { Usuarios } from '../../services/usuarios';
import { Beneficios } from '../../services/beneficios';
import { Compra } from '../../services/compra';
import { MovimientoPuntos, Recompensa } from '../../models/beneficios';
import { MovimientoCredito } from '../../models/seguimiento';
import { Venta } from '../../models/venta';

@Component({
  selector: 'app-perfil',
  imports: [SharedModule],
  templateUrl: './perfil.html',
  styleUrl: './perfil.css',
})
export class Perfil implements OnInit {
  private usuarios = inject(Usuarios);
  private beneficios = inject(Beneficios);
  private compra = inject(Compra);
  private solicitud?: { clave: string; id: string };
  private consultaQr = 0;
  usuario = toSignal(this.usuarios.usuarioActual$, { initialValue: undefined });
  recompensas = this.beneficios.recompensas;
  movimientos = signal<MovimientoPuntos[]>([]);
  movimientosCredito = signal<MovimientoCredito[]>([]);
  canjes = signal<Venta[]>([]);
  canjeSeleccionado = signal<Venta | undefined>(undefined);
  imagenQr = signal('');
  cargando = signal(true);
  procesando = signal(false);
  mensaje = signal('');
  error = signal(false);
  historial: 'puntos' | 'credito' = 'puntos';
  cantidades: Record<number, number> = {};

  get destinoCanjes(): string {
    return this.compra.getFuncion() ? '/pago' : '/';
  }
  maximoCanje(recompensa: Recompensa): number {
    return Math.min(99, Math.max(0, Math.floor((this.usuario()?.puntos ?? 0) / recompensa.puntos)));
  }
  normalizarCantidad(recompensa: Recompensa): void {
    const cantidad = Number(this.cantidades[recompensa.id] ?? 1);
    this.cantidades[recompensa.id] = Math.min(
      Math.max(1, this.maximoCanje(recompensa)),
      Number.isFinite(cantidad) ? Math.max(1, Math.floor(cantidad)) : 1,
    );
  }
  puedeCanjear(recompensa: Recompensa): boolean {
    return (
      !this.cargando() &&
      !this.procesando() &&
      recompensa.activa &&
      this.maximoCanje(recompensa) >= (this.cantidades[recompensa.id] ?? 1)
    );
  }
  async ngOnInit(): Promise<void> {
    await this.actualizar();
  }
  async actualizar(): Promise<void> {
    this.cargando.set(true);
    this.mensaje.set('');
    this.error.set(false);
    try {
      await this.usuarios.actualizarPerfil();
      await this.beneficios.cargar();
      const [puntos, credito, canjes] = await Promise.all([
        this.beneficios.getMovimientos(),
        this.beneficios.getMovimientosCredito(),
        this.beneficios.getMisCanjes(),
      ]);
      this.movimientos.set(puntos);
      this.movimientosCredito.set(credito);
      this.canjes.set(canjes);
      for (const recompensa of this.recompensas()) this.normalizarCantidad(recompensa);
      const seleccionado = this.canjeSeleccionado();
      if (seleccionado)
        this.canjeSeleccionado.set(
          canjes.find((canje) => canje.entrada.codigo === seleccionado.entrada.codigo) ??
            seleccionado,
        );
    } catch (error) {
      this.error.set(true);
      this.mensaje.set(mensajeServidor(error, 'No se pudo cargar tu perfil.'));
    } finally {
      this.cargando.set(false);
    }
  }
  async canjear(recompensa: Recompensa): Promise<void> {
    if (recompensa.tipo !== 'producto' || !this.puedeCanjear(recompensa)) return;
    this.procesando.set(true);
    this.mensaje.set('Confirmando canje…');
    this.error.set(false);
    const cantidad = this.cantidades[recompensa.id] ?? 1;
    const clave = `${recompensa.id}:${cantidad}:${recompensa.puntos}`;
    if (this.solicitud?.clave !== clave) this.solicitud = { clave, id: crypto.randomUUID() };
    try {
      const venta = await this.beneficios.canjearProducto(recompensa, cantidad, this.solicitud.id);
      this.solicitud = undefined;
      this.canjes.update((canjes) => [
        venta,
        ...canjes.filter((c) => c.entrada.codigo !== venta.entrada.codigo),
      ]);
      await this.mostrarCanje(venta);
      await this.actualizar();
      if (!this.error())
        this.mensaje.set('Canje confirmado. Mostrá el QR en el Candy Bar para retirarlo.');
    } catch (error) {
      this.error.set(true);
      this.mensaje.set(
        mensajeServidor(error, 'No se pudo confirmar el canje. Intentá nuevamente.'),
      );
    } finally {
      this.procesando.set(false);
    }
  }
  async mostrarCanje(venta: Venta): Promise<void> {
    const consulta = ++this.consultaQr;
    this.canjeSeleccionado.set(venta);
    this.imagenQr.set('');
    try {
      const { default: QRCode } = await import('qrcode');
      const imagen = await QRCode.toDataURL(venta.entrada.codigo, { width: 260, margin: 2 });
      if (consulta === this.consultaQr) this.imagenQr.set(imagen);
    } catch {
      this.error.set(true);
      this.mensaje.set('No se pudo dibujar el QR. Podés retirar el canje con su código manual.');
    }
  }
}
