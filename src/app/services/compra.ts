import { Injectable } from '@angular/core';
import { Funcion } from '../models/funcion';
import { CanjeSeleccionado } from '../models/beneficios';

@Injectable({
  providedIn: 'root',
})
export class Compra {
  private comboId?: number;
  private cantidadCombos = 0;
  private canjes: CanjeSeleccionado[] = [];
  private solicitud = crypto.randomUUID();
  private funcion?: Funcion;
  private butacasSeleccionadas: string[] = [];
  private funcionPendiente?: Funcion;
  private fechaNacimientoInvitado?: string;

  constructor() {
    try {
      const datos = JSON.parse(sessionStorage.getItem('cineplus_compra') ?? '{}');
      this.comboId = datos.comboId;
      this.cantidadCombos = datos.cantidadCombos ?? 0;
      this.canjes = Array.isArray(datos.canjes) ? datos.canjes : [];
      this.solicitud = typeof datos.solicitud === 'string' ? datos.solicitud : this.solicitud;
      this.funcion = datos.funcion;
      this.butacasSeleccionadas = Array.isArray(datos.butacas) ? datos.butacas : [];
      this.funcionPendiente = datos.pendiente;
      this.fechaNacimientoInvitado = datos.nacimiento;
    } catch {
      /* Se empieza una compra nueva cuando el borrador es inválido. */
    }
  }

  private guardarBorrador(): void {
    sessionStorage.setItem(
      'cineplus_compra',
      JSON.stringify({
        comboId: this.comboId,
        cantidadCombos: this.cantidadCombos,
        canjes: this.canjes,
        solicitud: this.solicitud,
        funcion: this.funcion,
        butacas: this.butacasSeleccionadas,
        pendiente: this.funcionPendiente,
        nacimiento: this.fechaNacimientoInvitado,
      }),
    );
  }

  guardarCompra(funcion: Funcion, butacasSeleccionadas: string[]): void {
    if (this.funcion?.id !== funcion.id) {
      this.comboId = undefined;
      this.cantidadCombos = 0;
      this.canjes = [];
    }
    this.solicitud = crypto.randomUUID();
    this.cantidadCombos = Math.min(this.cantidadCombos, butacasSeleccionadas.length);
    this.funcion = funcion;
    this.butacasSeleccionadas = [...butacasSeleccionadas];
    this.funcionPendiente = undefined;
    this.guardarBorrador();
  }

  getFuncion(): Funcion | undefined {
    return this.funcion;
  }

  getButacasSeleccionadas(): string[] {
    return [...this.butacasSeleccionadas];
  }

  guardarFuncionPendiente(funcion: Funcion | undefined): void {
    this.funcionPendiente = funcion;
    this.guardarBorrador();
  }

  getFuncionPendiente(): Funcion | undefined {
    return this.funcionPendiente;
  }

  guardarFechaNacimientoInvitado(fechaNacimiento: string): void {
    this.fechaNacimientoInvitado = fechaNacimiento;
    this.guardarBorrador();
  }

  getFechaNacimientoInvitado(): string | undefined {
    return this.fechaNacimientoInvitado;
  }

  getComboId(): number | undefined {
    return this.comboId;
  }
  getCantidadCombos(): number {
    return this.cantidadCombos;
  }
  guardarCombo(id: number | undefined, cantidad: number): void {
    this.comboId = id;
    this.cantidadCombos = cantidad;
    this.guardarBorrador();
  }
  getCanjes(): CanjeSeleccionado[] {
    return this.canjes.map((c) => ({ ...c }));
  }
  guardarCanjes(canjes: CanjeSeleccionado[]): void {
    this.canjes = canjes.map((c) => ({ ...c }));
    this.guardarBorrador();
  }
  getSolicitud(): string {
    return this.solicitud;
  }
  tieneBorrador(): boolean {
    return (
      !!this.funcion ||
      !!this.funcionPendiente ||
      this.butacasSeleccionadas.length > 0 ||
      this.cantidadCombos > 0 ||
      this.canjes.length > 0 ||
      !!this.fechaNacimientoInvitado
    );
  }
  limpiarCompra(): void {
    this.comboId = undefined;
    this.cantidadCombos = 0;
    this.canjes = [];
    this.solicitud = crypto.randomUUID();
    this.funcion = undefined;
    this.butacasSeleccionadas = [];
    this.funcionPendiente = undefined;
    this.fechaNacimientoInvitado = undefined;
    sessionStorage.removeItem('cineplus_compra');
  }
}
