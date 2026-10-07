import { inject, Injectable } from '@angular/core';
import { Funcion } from '../models/funcion';
import { Compra } from './compra';
import { CandyBar } from './candy-bar';
import { Butacas } from './butacas';
import { Beneficios } from './beneficios';
import { Configuracion } from './configuracion';
import { Cupones } from './cupones';
import { Usuarios } from './usuarios';
import { cotizarCompra } from '../utils/cotizacion';
import { Peliculas } from './peliculas';
import { estadoVenta, precioVigente } from '../utils/estrenos';
@Injectable({ providedIn: 'root' })
export class Cotizaciones {
  private compra = inject(Compra);
  private candy = inject(CandyBar);
  private butacas = inject(Butacas);
  private beneficios = inject(Beneficios);
  private configuracion = inject(Configuracion);
  private cupones = inject(Cupones);
  private usuarios = inject(Usuarios);
  private peliculas = inject(Peliculas);
  async cargar(): Promise<void> {
    await Promise.all([
      this.candy.cargar(),
      this.butacas.cargarSalasYPrecios(),
      this.beneficios.cargar(),
      this.cupones.cargar(),
      this.usuarios.esperarSesion(),
      this.peliculas.cargar(),
    ]);
    await this.usuarios.actualizarPerfil();
  }
  calcular(funcion: Funcion, ids: string[], codigoCupon?: string) {
    const pelicula = this.peliculas.getPeliculaPorId(funcion.peliculaId);
    if (!pelicula || !['cartelera', 'preventa'].includes(estadoVenta(pelicula)))
      throw new Error('Las entradas de esta película todavía no están disponibles.');
    funcion = precioVigente(funcion, pelicula);
    if (!this.candy.pedidoDisponible())
      throw new Error('Un producto de tu pedido ya no está disponible. Revisá el Candy Bar.');
    let porcentajeCupon = 0;
    if (codigoCupon) {
      const resultado = this.cupones.validarCupon(codigoCupon);
      if (!resultado.valido || !resultado.cupon) throw new Error(resultado.mensaje);
      porcentajeCupon = resultado.cupon.porcentajeDescuento;
    }
    const usuario = this.usuarios.getUsuarioActual();
    return cotizarCompra({
      precioEntrada: funcion.precio,
      cantidadEntradas: ids.length,
      cantidadVip: ids.filter(
        (id) =>
          this.butacas.getButacas(funcion.salaNumero).find((b) => b.id === id)?.tipo === 'VIP',
      ).length,
      extraVip: this.configuracion.getConfiguracion().extraVip,
      productos: this.candy.getProductos(),
      items: this.candy.getItemsPedido(),
      combo: this.beneficios.combos().find((c) => c.id === this.compra.getComboId()),
      cantidadCombos: this.compra.getCantidadCombos(),
      recompensas: this.beneficios.recompensas(),
      canjes: usuario ? this.compra.getCanjes() : [],
      puntosDisponibles: Math.max(0, usuario?.puntos ?? 0),
      porcentajePrimeraCompra: this.usuarios.tieneDescuentoPrimeraCompra()
        ? this.usuarios.getPorcentajeDescuentoPrimeraCompra()
        : 0,
      porcentajeCupon,
    });
  }
}
