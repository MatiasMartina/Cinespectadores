import { mensajeServidor } from '../../utils/errores';
import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  FormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Funcion } from '../../models/funcion';
import { Pelicula } from '../../models/pelicula';
import { Butacas } from '../../services/butacas';
import { CandyBar } from '../../services/candy-bar';
import { Compra } from '../../services/compra';
import { Peliculas } from '../../services/peliculas';
import { Entrada, ItemCandyEntrada } from '../../models/entrada';
import { Entradas } from '../../services/entradas';
import { Usuarios } from '../../services/usuarios';
import { Cupon } from '../../models/cupon';
import { Cupones } from '../../services/cupones';
import { Ventas } from '../../services/ventas';
import { Cotizaciones } from '../../services/cotizaciones';
import { Beneficios } from '../../services/beneficios';
import { Recompensa } from '../../models/beneficios';
import { Funciones } from '../../services/funciones';
import { Usuario } from '../../models/usuario';
import { Subscription } from 'rxjs';
import {
  nombreTitularValido,
  numeroTarjetaValido,
  vencimientoTarjetaValido,
} from '../../utils/tarjetas';
import { fechaArgentina } from '../../utils/estrenos';
import { SalidaCompra } from '../../services/salida-compra';

@Component({
  selector: 'app-pago',
  imports: [ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './pago.html',
  styleUrl: './pago.css',
})
export class Pago implements OnInit, OnDestroy {
  private router = inject(Router);
  private compraService = inject(Compra);
  private butacasService = inject(Butacas);
  private candyBarService = inject(CandyBar);
  private peliculasService = inject(Peliculas);
  private entradasService = inject(Entradas);
  private usuariosService = inject(Usuarios);
  private cuponesService = inject(Cupones);

  private ventasService = inject(Ventas);
  private suscripcionUsuario?: Subscription;
  private cotizaciones = inject(Cotizaciones);
  private beneficios = inject(Beneficios);
  private funcionesService = inject(Funciones);
  private destruido = false;
  private salidaCompra = inject(SalidaCompra);
  usuario = signal<Usuario | undefined>(undefined);
  cargando = signal(true);
  falloCarga = signal('');
  cotizacionValida = signal(false);
  combos = this.beneficios.combos;
  recompensas = this.beneficios.recompensas;
  comboId: number | undefined = this.compraService.getComboId();
  cantidadCombos = this.compraService.getCantidadCombos();
  cantidadesCanje: Record<number, number> = {};
  usarCredito = false;
  get creditoDisponible(): number {
    return Math.max(0, this.usuario()?.credito ?? 0);
  }
  get creditoAplicado(): number {
    return this.usarCredito ? Math.min(this.total, this.creditoDisponible) : 0;
  }
  get totalTarjeta(): number {
    return this.total - this.creditoAplicado;
  }
  get puntosDisponibles(): number {
    return Math.max(0, this.usuario()?.puntos ?? 0);
  }
  get puntosRestantes(): number {
    return Math.max(0, this.puntosDisponibles - this.puntosUsados);
  }
  get detalleEntradas() {
    const funcion = this.funcion;
    if (!funcion || !this.cotizacionValida()) return [];
    const canjes = this.recompensas()
      .filter((r) => r.tipo === 'entrada' && r.activa)
      .flatMap((r) => Array.from({ length: this.cantidadesCanje[r.id] || 0 }, () => r));
    return this.butacasSeleccionadas.map((id, indice) => {
      const canje =
        indice >= this.cantidadCombos ? canjes[indice - this.cantidadCombos] : undefined;
      const precio = this.butacasService.getPrecioButaca(funcion.precio, id, funcion.salaNumero);
      return {
        id,
        canjeada: !!canje,
        enCombo: indice < this.cantidadCombos,
        precio,
        importe: canje ? precio - funcion.precio : precio,
        puntos: canje?.puntos ?? 0,
      };
    });
  }
  get entradasCanjeadas(): number {
    return this.recompensas()
      .filter((r) => r.tipo === 'entrada')
      .reduce((total, r) => total + (this.cantidadesCanje[r.id] || 0), 0);
  }
  get maximoCombos(): number {
    return Math.max(0, this.butacasSeleccionadas.length - this.entradasCanjeadas);
  }
  maximoCanje(recompensa: Recompensa): number {
    const otras = this.recompensas().filter((r) => r.id !== recompensa.id);
    const puntosReservados = otras.reduce(
      (total, r) => total + r.puntos * (this.cantidadesCanje[r.id] || 0),
      0,
    );
    const porSaldo = Math.max(
      0,
      Math.floor((this.puntosDisponibles - puntosReservados) / recompensa.puntos),
    );
    const otrasEntradas = otras
      .filter((r) => r.tipo === 'entrada')
      .reduce((total, r) => total + (this.cantidadesCanje[r.id] || 0), 0);
    return Math.min(
      99,
      porSaldo,
      recompensa.tipo === 'entrada'
        ? Math.max(0, this.butacasSeleccionadas.length - this.cantidadCombos - otrasEntradas)
        : 99,
    );
  }
  get ahorroCombo(): number {
    return this.importes().ahorroCombo;
  }
  get precioCombo(): number {
    return this.combos().find((combo) => combo.id === this.comboId)?.precio ?? 0;
  }
  get totalEntradasSinPromocion(): number {
    return this.subtotal - this.productosCandy.reduce((total, item) => total + item.subtotal, 0);
  }
  get descuentoCanjes(): number {
    return this.importes().descuentoCanjes;
  }
  get puntosUsados(): number {
    return this.importes().puntosUsados;
  }
  entrada?: Entrada;
  procesando = signal(false);
  mensajePago = signal('');

  funcion?: Funcion;
  pelicula = signal<Pelicula | undefined>(undefined);
  codigoEntrada = '';
  butacasSeleccionadas: string[] = [];
  productosCandy: ItemCandyEntrada[] = [];
  private importes = signal({
    ahorroCombo: 0,
    descuentoCanjes: 0,
    puntosUsados: 0,
    total: 0,
    subtotal: 0,
    descuentoPrimeraCompra: 0,
    porcentajeDescuento: 0,
  });
  pagoAprobado = false;
  cuponAplicado?: Cupon;
  mensajeCupon = '';
  descuentoCupon = 0;

  // Los getters conservan los nombres que ya utiliza pago.html.
  get total(): number {
    return this.importes().total;
  }

  get subtotal(): number {
    return this.importes().subtotal;
  }

  get descuentoPrimeraCompra(): number {
    return this.importes().descuentoPrimeraCompra;
  }

  get porcentajeDescuento(): number {
    return this.importes().porcentajeDescuento;
  }

  formularioPago = new FormGroup({
    codigoCupon: new FormControl('', {
      nonNullable: true,
    }),
    nombreTitular: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.pattern(/^[A-Za-zÁÉÍÓÚáéíóúÑñÜü' -]+$/),
        nombreTitularValido,
      ],
    }),

    numeroTarjeta: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^\d{16}$/), numeroTarjetaValido],
    }),

    vencimiento: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.pattern(/^(0[1-9]|1[0-2])\/\d{2}$/),
        vencimientoTarjetaValido,
      ],
    }),

    codigoSeguridad: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^\d{3}$/)],
    }),
  });

  get hayUsuarioIniciado(): boolean {
    return this.usuario() !== undefined;
  }

  async ngOnInit(): Promise<void> {
    for (const canje of this.compraService.getCanjes())
      this.cantidadesCanje[canje.recompensaId] = canje.cantidad;
    this.funcion = this.compraService.getFuncion();
    this.butacasSeleccionadas = this.compraService.getButacasSeleccionadas();
    if (!this.funcion || !this.butacasSeleccionadas.length) {
      void this.router.navigate(['/']);
      return;
    }
    await this.cargarCompra();
  }
  async cargarCompra(): Promise<void> {
    if (!this.funcion) return;
    this.cargando.set(true);
    this.falloCarga.set('');
    try {
      await this.cotizaciones.cargar();
      const funcion = await this.funcionesService.getFuncionPorIdDesdeSupabase(this.funcion.id);
      if (this.destruido) return;
      if (!funcion) throw new Error('La función ya no está disponible.');
      this.funcion = funcion;
      const pelicula = await this.peliculasService.getPeliculaPorIdDesdeSupabase(
        funcion.peliculaId,
      );
      if (this.destruido) return;
      this.pelicula.set(pelicula);
      this.suscripcionUsuario?.unsubscribe();
      this.suscripcionUsuario = this.usuariosService.usuarioActual$.subscribe((usuario) => {
        this.usuario.set(usuario);
        if (!usuario) {
          this.cantidadesCanje = {};
          this.compraService.guardarCanjes([]);
        }
        if (!this.pagoAprobado && !this.procesando()) this.actualizarImportes();
      });
    } catch (error) {
      this.falloCarga.set(mensajeServidor(error, 'No se pudo cargar la compra.'));
    } finally {
      if (!this.destruido) this.cargando.set(false);
    }
  }
  ngOnDestroy(): void {
    this.destruido = true;
    this.suscripcionUsuario?.unsubscribe();
  }
  cambiarCombo(): void {
    this.cantidadCombos = this.comboId
      ? Math.min(this.maximoCombos, this.cantidadValida(this.cantidadCombos))
      : 0;
    this.compraService.guardarCombo(this.comboId, this.cantidadCombos);
    this.actualizarImportes();
  }
  cambiarCanjes(recompensaId?: number): void {
    if (recompensaId !== undefined) {
      const recompensa = this.recompensas().find((r) => r.id === recompensaId);
      this.cantidadesCanje[recompensaId] = recompensa?.activa
        ? Math.min(
            this.maximoCanje(recompensa),
            this.cantidadValida(this.cantidadesCanje[recompensaId]),
          )
        : 0;
    }
    this.compraService.guardarCanjes(
      Object.entries(this.cantidadesCanje)
        .filter(([, cantidad]) => cantidad > 0)
        .map(([id, cantidad]) => ({ recompensaId: Number(id), cantidad: Number(cantidad) })),
    );
    this.actualizarImportes();
  }
  private cantidadValida(valor: number): number {
    return Number.isFinite(Number(valor)) ? Math.max(0, Math.floor(Number(valor))) : 0;
  }
  private actualizarImportes(): void {
    if (!this.funcion) return;
    try {
      const cotizacion = this.cotizaciones.calcular(
        this.funcion,
        this.butacasSeleccionadas,
        this.cuponAplicado?.codigo,
      );
      this.descuentoCupon = cotizacion.descuentoCupon;
      this.productosCandy = cotizacion.productosCandy;
      this.importes.set({
        ...cotizacion,
        porcentajeDescuento: this.usuariosService.tieneDescuentoPrimeraCompra()
          ? this.usuariosService.getPorcentajeDescuentoPrimeraCompra()
          : 0,
      });
      this.cotizacionValida.set(true);
      this.actualizarCamposTarjeta();
      this.mensajePago.set('');
    } catch (error) {
      this.cotizacionValida.set(false);
      this.actualizarCamposTarjeta();
      this.mensajePago.set(mensajeServidor(error, 'Revisá tu compra.'));
    }
  }
  limpiarNombreTitular(): void {
    const control = this.formularioPago.controls.nombreTitular;

    const valorLimpio = control.value
      .replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñÜü' -]/g, '')
      .replace(/\s{2,}/g, ' ');

    control.setValue(valorLimpio, {
      emitEvent: false,
    });
  }

  cambiarCredito(): void {
    this.actualizarCamposTarjeta();
  }
  usarTarjetaDePrueba(): void {
    if (this.procesando()) return;
    const [anio, mes] = fechaArgentina().split('-');
    this.formularioPago.patchValue({
      nombreTitular: 'Titular de prueba',
      numeroTarjeta: '4242424242424242',
      vencimiento: `${mes}/${String(Number(anio) + 2).slice(-2)}`,
      codigoSeguridad: '123',
    });
  }
  private actualizarCamposTarjeta(): void {
    const { nombreTitular, numeroTarjeta, vencimiento, codigoSeguridad } =
      this.formularioPago.controls;
    for (const control of [nombreTitular, numeroTarjeta, vencimiento, codigoSeguridad]) {
      if (this.cotizacionValida() && this.totalTarjeta === 0 && control.enabled)
        control.disable({ emitEvent: false });
      else if ((!this.cotizacionValida() || this.totalTarjeta > 0) && control.disabled)
        control.enable({ emitEvent: false });
    }
  }

  formatearNumeroTarjeta(): void {
    const control = this.formularioPago.controls.numeroTarjeta;

    const numeros = control.value.replace(/\D/g, '').slice(0, 16);

    control.setValue(numeros, {
      emitEvent: false,
    });
  }

  formatearVencimiento(): void {
    const control = this.formularioPago.controls.vencimiento;

    const numeros = control.value.replace(/\D/g, '').slice(0, 4);

    const mes = numeros.slice(0, 2);
    const anio = numeros.slice(2, 4);

    const vencimiento = numeros.length > 2 ? `${mes}/${anio}` : mes;

    control.setValue(vencimiento, {
      emitEvent: false,
    });
  }

  formatearCodigoSeguridad(): void {
    const control = this.formularioPago.controls.codigoSeguridad;

    const numeros = control.value.replace(/\D/g, '').slice(0, 3);

    control.setValue(numeros, {
      emitEvent: false,
    });
  }

  aplicarCupon(): void {
    const resultado = this.cuponesService.validarCupon(
      this.formularioPago.controls.codigoCupon.value,
    );
    this.cuponAplicado = resultado.valido ? resultado.cupon : undefined;
    this.mensajeCupon = resultado.mensaje;
    this.actualizarImportes();
    if (
      resultado.valido &&
      this.descuentoPrimeraCompra > 0 &&
      this.descuentoPrimeraCompra >= this.descuentoCupon
    )
      this.mensajeCupon +=
        ' Se mantiene el beneficio de primera compra porque ofrece el mismo descuento o uno mayor.';
  }
  cancelarCompra(): void {
    if (this.pagoAprobado || this.procesando() || this.cargando()) return;
    if (!this.salidaCompra.cancelarCompra(this)) return;
    this.formularioPago.reset();
    this.comboId = undefined;
    this.cantidadCombos = 0;
    this.cantidadesCanje = {};
    this.butacasSeleccionadas = [];
    this.productosCandy = [];
    this.cuponAplicado = undefined;
    this.usarCredito = false;
    this.mensajeCupon = '';
    this.mensajePago.set('');
    void this.router.navigate(['/']);
  }
  async procesarPago(): Promise<void> {
    if (this.pagoAprobado || this.procesando() || this.cargando() || !this.cotizacionValida())
      return;
    if (this.formularioPago.invalid) {
      this.formularioPago.markAllAsTouched();
      return;
    }
    if (!this.funcion || !this.butacasSeleccionadas.length) {
      void this.router.navigate(['/']);
      return;
    }
    const mostrado = this.total;
    const creditoMostrado = this.creditoAplicado;
    this.actualizarImportes();
    if (!this.cotizacionValida()) return;
    if (this.total !== mostrado || this.creditoAplicado !== creditoMostrado) {
      this.mensajePago.set(
        'Los precios o beneficios cambiaron. Revisá el total y confirmá nuevamente.',
      );
      return;
    }
    this.mensajePago.set('');
    this.procesando.set(true);
    try {
      const resultado = await this.ventasService.confirmarCompra(
        this.funcion.id,
        this.butacasSeleccionadas,
        this.cuponAplicado?.codigo,
        this.total,
        this.puntosUsados,
        this.usarCredito,
        creditoMostrado,
      );
      if (!resultado.valido || !resultado.venta) {
        await this.cargarCompra();
        this.actualizarImportes();
        this.mensajePago.set(resultado.mensaje);
        return;
      }
      const entrada = resultado.venta.entrada;
      this.entrada = entrada;
      this.codigoEntrada = entrada.codigo;
      this.productosCandy = entrada.productosCandy;
      this.importes.update((i) => ({ ...i, total: entrada.total }));
      this.pagoAprobado = true;
      this.formularioPago.reset();
    } catch {
      this.mensajePago.set('No se pudo guardar la compra. Intentá nuevamente.');
    } finally {
      this.procesando.set(false);
    }
  }

  async descargarEntrada(): Promise<void> {
    if (!this.pagoAprobado || !this.entrada) return;
    try {
      await this.entradasService.descargarEntrada(this.entrada);
    } catch {
      alert('No se pudo generar la entrada. Intentá nuevamente.');
    }
  }
}
