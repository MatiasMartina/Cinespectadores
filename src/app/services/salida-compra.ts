import { inject, Injectable, OnDestroy } from '@angular/core';
import {
  NavigationCancel,
  NavigationCancellationCode,
  NavigationEnd,
  NavigationError,
  NavigationSkipped,
  PRIMARY_OUTLET,
  Router,
} from '@angular/router';
import { Subscription } from 'rxjs';
import { Funcion } from '../models/funcion';
import { CandyBar } from './candy-bar';
import { Compra } from './compra';

export interface PaginaCompra {
  funcion?: Funcion;
  butacasSeleccionadas?: string[];
  modoEdicion?: boolean;
  pagoAprobado?: boolean;
  procesando?: () => boolean;
}

@Injectable({ providedIn: 'root' })
export class SalidaCompra implements OnDestroy {
  private router = inject(Router);
  private compra = inject(Compra);
  private candy = inject(CandyBar);
  private pagina?: PaginaCompra;
  private salidaConfirmada = false;
  private documentoDescartado = false;
  private navegacion: Subscription;

  constructor() {
    this.navegacion = this.router.events.subscribe((evento) => {
      if (evento instanceof NavigationEnd) {
        // Descartar recién cuando la navegación terminó, nunca si otro guard la rechazó.
        if (this.salidaConfirmada || !this.esPasoCompra(evento.urlAfterRedirects)) {
          this.descartarCompra();
        }
        this.salidaConfirmada = false;
      } else if (
        (evento instanceof NavigationCancel &&
          evento.code !== NavigationCancellationCode.Redirect) ||
        evento instanceof NavigationError ||
        evento instanceof NavigationSkipped
      ) {
        this.salidaConfirmada = false;
      }
    });
  }

  registrarPagina(pagina?: PaginaCompra): void {
    this.pagina = pagina;
  }

  hayCambios(pagina = this.pagina): boolean {
    if (pagina?.pagoAprobado) return false;
    return (
      (pagina?.butacasSeleccionadas?.length ?? 0) > 0 ||
      this.compra.tieneBorrador() ||
      this.candy.hayPedido()
    );
  }

  private pagoEnProceso(pagina = this.pagina): boolean {
    return pagina?.pagoAprobado === false && !!pagina.procesando?.();
  }

  confirmarSalida(pagina = this.pagina): boolean {
    if (this.pagoEnProceso(pagina)) return false;
    return (
      !this.hayCambios(pagina) ||
      window.confirm(
        '¿Querés salir de la compra? Si salís, se perderán las butacas, los productos y los cambios que elegiste.',
      )
    );
  }

  permitirSalida(destino: string, pagina = this.pagina, origen = this.router.url): boolean {
    if (this.pagoEnProceso(pagina)) return false;
    if (!this.hayCambios(pagina)) return true;
    if (this.salidaConfirmada) return true;
    if (this.continuaCompra(origen, destino, pagina)) return true;
    if (!this.confirmarSalida(pagina)) return false;
    this.salidaConfirmada = true;
    return true;
  }

  cancelarCompra(pagina = this.pagina): boolean {
    if (this.pagoEnProceso(pagina)) return false;
    if (
      !window.confirm(
        '¿Estás seguro de que querés cancelar la compra? Se perderán las butacas, los productos y los cambios que elegiste.',
      )
    )
      return false;
    this.descartarCompra(pagina);
    return true;
  }

  descartarCompra(pagina = this.pagina): void {
    this.compra.limpiarCompra();
    this.candy.limpiarPedido();
    if (pagina?.butacasSeleccionadas && !pagina.pagoAprobado) {
      pagina.butacasSeleccionadas = [];
    }
  }

  private ruta(url: string): string {
    return (
      this.router
        .parseUrl(url)
        .root.children[PRIMARY_OUTLET]?.segments.map((s) => s.path)
        .join('/') ?? ''
    );
  }

  private esPasoCompra(url: string, permitirAutenticacion = true): boolean {
    const ruta = this.ruta(url);
    if (ruta === 'candy-bar') return true;
    const funcion = this.compra.getFuncion();
    const pendiente = this.compra.getFuncionPendiente();
    if (ruta === 'confirmacion' || ruta === 'pago') {
      return !!funcion && this.compra.getButacasSeleccionadas().length > 0;
    }
    const butacas = /^funcion\/(\d+)\/butacas$/.exec(ruta);
    if (butacas) {
      const id = Number(butacas[1]);
      return id === funcion?.id || id === pendiente?.id || ruta === this.ruta(this.router.url);
    }
    const query = this.router.parseUrl(url).queryParams;
    const pelicula = /^pelicula\/(\d+)$/.exec(ruta);
    if (pelicula && query['editar'] === 'true') {
      const id = Number(pelicula[1]);
      return id === funcion?.peliculaId || id === pendiente?.peliculaId;
    }
    if (permitirAutenticacion && (ruta === 'inicio-sesion' || ruta === 'registro')) {
      const retorno: unknown = query['returnUrl'];
      return (
        typeof retorno === 'string' &&
        retorno.startsWith('/') &&
        !retorno.startsWith('//') &&
        this.esPasoCompra(retorno, false)
      );
    }
    return false;
  }

  private continuaCompra(origen: string, destino: string, pagina?: PaginaCompra): boolean {
    if (!this.esPasoCompra(destino)) return false;
    const actual = this.ruta(origen);
    if (!/^funcion\/\d+\/butacas$/.test(actual)) return true;
    const siguiente = this.ruta(destino);
    if (actual === siguiente) return true;
    if (pagina?.modoEdicion && (siguiente === 'confirmacion' || /^pelicula\/\d+$/.test(siguiente)))
      return true;
    const guardadas = this.compra.getButacasSeleccionadas();
    const locales = pagina?.butacasSeleccionadas ?? [];
    // Continuar valida y guarda primero; el enlace Candy del navbar no debe saltear ese paso.
    return (
      pagina?.funcion?.id === this.compra.getFuncion()?.id &&
      locales.length === guardadas.length &&
      locales.every((id) => guardadas.includes(id))
    );
  }

  avisarAntesDeSalir(evento: BeforeUnloadEvent): void {
    if (this.documentoDescartado || (!this.hayCambios() && !this.pagoEnProceso())) return;
    evento.preventDefault();
    evento.returnValue = '';
  }

  descartarAlSalirDelDocumento(): void {
    if (this.pagoEnProceso() || !this.hayCambios()) return;
    // pagehide ocurre después de aceptar salir; beforeunload puede cancelarse.
    this.descartarCompra();
    this.documentoDescartado = true;
  }

  revisarRestauracion(evento: PageTransitionEvent): void {
    if (evento.persisted && this.documentoDescartado) window.location.reload();
  }

  ngOnDestroy(): void {
    this.navegacion.unsubscribe();
  }
}
