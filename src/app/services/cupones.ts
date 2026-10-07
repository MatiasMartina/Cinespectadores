import { mensajeServidor } from '../utils/errores';
import { inject, Injectable, signal } from '@angular/core';
import { Cupon } from '../models/cupon';
import { Usuarios } from './usuarios';
import { Supabase } from './supabase';
interface ResultadoCupon {
  valido: boolean;
  mensaje: string;
  cupon?: Cupon;
}
@Injectable({ providedIn: 'root' })
export class Cupones {
  private usuariosService = inject(Usuarios);
  private supabase = inject(Supabase);
  private cupones = signal<Cupon[]>([]);
  getCupones(): Cupon[] {
    return this.cupones();
  }
  async cargar(): Promise<void> {
    const { data, error } = await this.supabase.cliente.from('cupones').select('*').order('codigo');
    if (error) throw new Error('No se pudieron cargar los cupones.');
    this.cupones.set(
      data.map((c) => ({
        id: c.id,
        codigo: c.codigo,
        descripcion: c.descripcion,
        porcentajeDescuento: Number(c.porcentaje_descuento),
        edadMinima: c.edad_minima ?? undefined,
        activo: c.activo,
      })),
    );
  }
  validarCupon(codigoIngresado: string): ResultadoCupon {
    const codigoNormalizado = codigoIngresado.trim().toUpperCase();

    if (!codigoNormalizado) {
      return {
        valido: false,
        mensaje: 'Ingresá un código de cupón.',
      };
    }

    const cuponEncontrado = this.getCupones().find(
      (cupon) => cupon.codigo === codigoNormalizado && cupon.activo,
    );

    if (!cuponEncontrado) {
      return {
        valido: false,
        mensaje: 'El cupón no existe o no está activo.',
      };
    }

    if (cuponEncontrado.edadMinima !== undefined) {
      const usuarioActual = this.usuariosService.getUsuarioActual();

      if (!usuarioActual) {
        return {
          valido: false,
          mensaje: 'Tenés que iniciar sesión para utilizar este cupón.',
        };
      }

      const edadUsuario = this.usuariosService.calcularEdad(usuarioActual.fechaNacimiento);

      if (!Number.isFinite(edadUsuario) || edadUsuario < cuponEncontrado.edadMinima) {
        return {
          valido: false,
          mensaje:
            `Este cupón requiere una edad mínima de ` + `${cuponEncontrado.edadMinima} años.`,
        };
      }
    }

    return {
      valido: true,
      mensaje: `Cupón aplicado: ` + `${cuponEncontrado.porcentajeDescuento}% de descuento.`,
      cupon: cuponEncontrado,
    };
  }

  calcularDescuento(total: number, cupon: Cupon): number {
    return Math.round(total * (cupon.porcentajeDescuento / 100));
  }

  async guardarCupon(datos: Omit<Cupon, 'id'>, id?: number): Promise<boolean> {
    if (
      !datos.codigo.trim() ||
      !datos.descripcion.trim() ||
      !Number.isFinite(datos.porcentajeDescuento) ||
      datos.porcentajeDescuento <= 0 ||
      datos.porcentajeDescuento > 100 ||
      (datos.edadMinima !== undefined &&
        (!Number.isInteger(datos.edadMinima) || datos.edadMinima < 0 || datos.edadMinima > 130))
    )
      return false;
    const fila = {
      codigo: datos.codigo.trim().toUpperCase(),
      descripcion: datos.descripcion.trim(),
      porcentaje_descuento: datos.porcentajeDescuento,
      edad_minima: datos.edadMinima ?? null,
      activo: datos.activo,
    };
    const tabla = this.supabase.cliente.from('cupones');
    const { error } =
      id === undefined ? await tabla.insert(fila) : await tabla.update(fila).eq('id', id);
    if (error)
      throw new Error(
        error.code === '23505'
          ? 'Ya existe un cupón con ese código. Elegí otro.'
          : mensajeServidor(error, 'No se pudo guardar el cupón. Intentá nuevamente.'),
      );
    await this.cargar();
    return true;
  }
  async eliminarCupon(id: number): Promise<void> {
    const { error } = await this.supabase.cliente.from('cupones').delete().eq('id', id);
    if (error)
      throw new Error(mensajeServidor(error, 'No se pudo eliminar el cupón. Intentá nuevamente.'));
    await this.cargar();
  }
}
