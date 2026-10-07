import { AfterViewInit, Component, input, OnDestroy, output, signal } from '@angular/core';
import type { Html5Qrcode } from 'html5-qrcode';

@Component({
  selector: 'app-lector-qr',
  templateUrl: './lector-qr.html',
  styleUrl: './lector-qr.css',
})
export class LectorQr implements AfterViewInit, OnDestroy {
  bloqueado = input(false);
  contexto = input('');
  codigoLeido = output<string>();
  ocupado = signal(false);
  camaraActiva = signal(false);
  mensaje = signal('');
  codigoDetectado = signal('');
  id = `lector-${crypto.randomUUID()}`;
  private lector?: Html5Qrcode;
  private destruido = false;
  private ultimoCodigo = '';
  private ultimoContexto = '';
  private ultimaDeteccion = 0;
  private cierre?: Promise<void>;

  async ngAfterViewInit(): Promise<void> {
    // El visor debe estar dibujado antes de que la biblioteca mida su ancho.
    await Promise.resolve();
    await this.iniciarCamara();
  }

  private async getLector(): Promise<Html5Qrcode> {
    if (!this.lector) {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode');
      if (this.destruido) throw new Error('Lector cerrado');
      this.lector = new Html5Qrcode(this.id, {
        verbose: false,
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
      });
    }
    return this.lector;
  }

  private async iniciarCamara(): Promise<void> {
    if (this.destruido || this.ocupado() || this.camaraActiva()) return;
    this.ocupado.set(true);
    this.mensaje.set('');
    try {
      const lector = await this.getLector();
      await lector.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: (ancho, alto) => {
            const lado = Math.floor(Math.min(ancho, alto, 360) * 0.8);
            return { width: lado, height: lado };
          },
        },
        (texto) => {
          this.ultimaDeteccion = Date.now();
          this.recibirCodigo(texto);
        },
        () => {
          // Puede volver a leer el mismo QR después de retirarlo del visor.
          if (Date.now() - this.ultimaDeteccion > 1500) this.ultimoCodigo = '';
        },
      );
      if (this.destruido) {
        await this.cerrarLector();
        if (!lector.isScanning) lector.clear();
      } else {
        this.camaraActiva.set(true);
      }
    } catch (error) {
      if (!this.destruido) this.mensaje.set(this.mensajeErrorCamara(error));
    } finally {
      if (!this.destruido) this.ocupado.set(false);
    }
  }

  private recibirCodigo(texto: string): void {
    if (this.destruido || this.bloqueado()) return;
    if (texto === this.ultimoCodigo && this.contexto() === this.ultimoContexto) return;
    this.ultimoCodigo = texto;
    this.ultimoContexto = this.contexto();
    this.codigoDetectado.set(texto);
    this.codigoLeido.emit(texto);
  }

  private async cerrarLector(): Promise<void> {
    if (this.cierre) return this.cierre;
    if (this.lector?.isScanning) {
      this.cierre = this.lector.stop().catch(() => {});
      await this.cierre;
      this.cierre = undefined;
    }
    if (!this.destruido) this.camaraActiva.set(false);
  }

  private mensajeErrorCamara(error: unknown): string {
    const detalle = error instanceof Error ? `${error.name} ${error.message}` : String(error);
    if (/NotAllowed|Permission|denied/i.test(detalle)) {
      return 'El navegador bloqueó la cámara. Permití su uso desde los permisos de esta página.';
    }
    if (/NotFound|DevicesNotFound|Overconstrained/i.test(detalle)) {
      return 'No se encontró una cámara disponible. Conectá una webcam e intentá nuevamente.';
    }
    if (/NotReadable|TrackStart|in use/i.test(detalle)) {
      return 'No se pudo usar la cámara. Cerrá las otras aplicaciones que puedan estar utilizándola.';
    }
    return 'No se pudo abrir la cámara. Revisá el permiso y que la página esté en localhost o HTTPS.';
  }

  ngOnDestroy(): void {
    this.destruido = true;
    void this.cerrarLector().then(() => {
      if (this.lector && !this.lector.isScanning) this.lector.clear();
    });
  }
}
