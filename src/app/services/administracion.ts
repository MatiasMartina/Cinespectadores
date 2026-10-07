import { mensajeServidor } from '../utils/errores';
import { inject, Injectable } from '@angular/core';
import { Pelicula } from '../models/pelicula';
import { Sala } from '../models/sala';
import { Butaca } from '../models/butaca';
import { ProductoCandy } from '../models/producto-candy';
import { Cupon } from '../models/cupon';
import { DatosEmpleado } from '../models/usuario';
import { Usuarios } from './usuarios';
import { Peliculas } from './peliculas';
import { Funciones, DatosFuncion, ResultadoProgramacion } from './funciones';
import { Salas } from './salas';
import { CandyBar } from './candy-bar';
import { Cupones } from './cupones';
import { Configuracion } from './configuracion';

@Injectable({ providedIn: 'root' })
export class Administracion {
  private usuarios = inject(Usuarios);
  private peliculas = inject(Peliculas);
  private funciones = inject(Funciones);
  private salas = inject(Salas);
  private candy = inject(CandyBar);
  private cupones = inject(Cupones);
  private configuracion = inject(Configuracion);

  private async esAdmin(): Promise<boolean> {
    await this.usuarios.esperarSesion();
    return this.usuarios.getUsuarioActual()?.rol === 'admin';
  }
  private async ejecutar(accion: () => Promise<unknown>, datosInvalidos: string): Promise<string> {
    if (!(await this.esAdmin())) return 'No tenés permiso para administrar.';
    try {
      return (await accion()) === false ? datosInvalidos : '';
    } catch (error) {
      return mensajeServidor(error, 'No se pudo guardar el cambio. Intentá nuevamente.');
    }
  }

  guardarPelicula(datos: Omit<Pelicula, 'id' | 'cantidadVendida'>, id?: number): Promise<string> {
    return this.ejecutar(
      () => this.peliculas.guardarPelicula(datos, id),
      'Revisá los datos de la película.',
    );
  }
  eliminarPelicula(id: number): Promise<string> {
    return this.ejecutar(
      () => this.peliculas.eliminarPelicula(id),
      'No se pudo eliminar la película.',
    );
  }
  guardarSala(datos: Omit<Sala, 'id' | 'butacas'>, id?: number): Promise<string> {
    return this.ejecutar(
      () => this.salas.guardarSala(datos, id),
      'Revisá el número, nombre y formatos de la sala.',
    );
  }
  eliminarSala(id: number): Promise<string> {
    return this.ejecutar(() => this.salas.eliminarSala(id), 'No se pudo eliminar la sala.');
  }
  actualizarButacas(
    numero: number,
    ids: string[],
    tipo: Butaca['tipo'],
    habilitada: boolean,
  ): Promise<string> {
    return this.ejecutar(
      () => this.salas.actualizarButacas(numero, ids, tipo, habilitada),
      'Seleccioná butacas válidas.',
    );
  }
  async guardarFuncion(datos: DatosFuncion, id?: number): Promise<ResultadoProgramacion> {
    if (!(await this.esAdmin()))
      return { valido: false, mensaje: 'No tenés permiso para administrar.', funciones: [] };
    try {
      return await this.funciones.guardarAutomatica(datos, id);
    } catch (error) {
      return {
        valido: false,
        mensaje: mensajeServidor(error, 'No se pudo guardar la función.'),
        funciones: [],
      };
    }
  }
  async programarSemana(
    datos: Omit<DatosFuncion, 'fecha'>,
    desde: string,
    hasta: string,
    dias: number[],
  ): Promise<ResultadoProgramacion> {
    if (!(await this.esAdmin()))
      return { valido: false, mensaje: 'No tenés permiso para administrar.', funciones: [] };
    try {
      return await this.funciones.programarSemana(datos, desde, hasta, dias);
    } catch (error) {
      return {
        valido: false,
        mensaje: mensajeServidor(error, 'No se pudo guardar la programación.'),
        funciones: [],
      };
    }
  }
  eliminarFuncion(id: number): Promise<string> {
    return this.ejecutar(
      () => this.funciones.eliminarFuncion(id),
      'La función tiene reservas o ventas y no se puede eliminar.',
    );
  }
  guardarProducto(datos: Omit<ProductoCandy, 'id'>, id?: number): Promise<string> {
    return this.ejecutar(
      () => this.candy.guardarProducto(datos, id),
      'Revisá el nombre, precio, imagen y categoría.',
    );
  }
  eliminarProducto(id: number): Promise<string> {
    return this.ejecutar(() => this.candy.eliminarProducto(id), 'No se pudo eliminar el producto.');
  }
  guardarCategoria(nombre: string, id?: number): Promise<string> {
    return this.ejecutar(
      () => this.candy.guardarCategoria(nombre, id),
      'Ingresá un nombre de categoría.',
    );
  }
  eliminarCategoria(id: number): Promise<string> {
    return this.ejecutar(() => this.candy.eliminarCategoria(id), 'La categoría tiene productos.');
  }
  guardarCupon(datos: Omit<Cupon, 'id'>, id?: number): Promise<string> {
    return this.ejecutar(
      () => this.cupones.guardarCupon(datos, id),
      'Revisá el código, porcentaje y edad mínima.',
    );
  }
  eliminarCupon(id: number): Promise<string> {
    return this.ejecutar(() => this.cupones.eliminarCupon(id), 'No se pudo eliminar el cupón.');
  }
  guardarConfiguracion(porcentaje: number, extraVip: number): Promise<string> {
    return this.ejecutar(
      () => this.configuracion.guardar(porcentaje, extraVip),
      'El descuento debe estar entre 0 y 100 y el adicional VIP debe ser un importe entero no negativo.',
    );
  }
  async guardarEmpleado(datos: DatosEmpleado, id?: number): Promise<string> {
    if (!(await this.esAdmin())) return 'No tenés permiso para administrar.';
    try {
      return (await this.usuarios.guardarEmpleado(datos, id))
        ? ''
        : 'Revisá los datos del empleado.';
    } catch (error) {
      return mensajeServidor(error, 'No se pudo guardar el empleado.');
    }
  }
  async eliminarEmpleado(id: number): Promise<string> {
    if (!(await this.esAdmin())) return 'No tenés permiso para administrar.';
    try {
      return (await this.usuarios.eliminarEmpleado(id)) ? '' : 'No se pudo eliminar la cuenta.';
    } catch (error) {
      return mensajeServidor(error, 'No se pudo eliminar el empleado.');
    }
  }
}
