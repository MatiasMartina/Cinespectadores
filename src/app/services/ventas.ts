import { mensajeServidor } from '../utils/errores';
import { inject, Injectable } from '@angular/core';
import { Venta, ResultadoVenta, SectorValidacion } from '../models/venta';
import { Almacenamiento } from './almacenamiento';
import { Funciones } from './funciones';
import { CandyBar } from './candy-bar';
import { Usuarios } from './usuarios';
import { Compra } from './compra';
import { Supabase } from './supabase';
import { Cotizaciones } from './cotizaciones';
import { nacimientoIso } from '../utils/fechas';

@Injectable({ providedIn: 'root' })
export class Ventas {
  private almacenamiento = inject(Almacenamiento);
  private funciones = inject(Funciones);
  private candy = inject(CandyBar);
  private usuarios = inject(Usuarios);
  private compra = inject(Compra);
  private supabase = inject(Supabase);
  private cotizaciones = inject(Cotizaciones);

  confirmarCompra(
    funcionId: number,
    ids: string[],
    codigoCupon?: string,
    totalEsperado?: number,
    puntosEsperados?: number,
    usarCredito = false,
    creditoEsperado = 0,
  ): Promise<ResultadoVenta> {
    return this.almacenamiento.exclusivoAsync(async () => {
      try {
        await this.cotizaciones.cargar();
        const funcion = await this.funciones.getFuncionPorIdDesdeSupabase(funcionId);
        if (!funcion) return this.error('La función no está disponible para comprar.');
        const precio = this.cotizaciones.calcular(funcion, ids, codigoCupon);
        if (
          (totalEsperado !== undefined && precio.total !== totalEsperado) ||
          (puntosEsperados !== undefined && precio.puntosUsados !== puntosEsperados)
        )
          return this.error(
            'El total cambió. Revisá los precios y beneficios antes de confirmar nuevamente.',
          );
        const usuario = this.usuarios.getUsuarioActual();
        const { data, error } = await this.supabase.cliente.rpc('confirmar_compra', {
          p_datos: {
            solicitud: this.compra.getSolicitud(),
            funcionId,
            butacas: ids,
            productos: this.candy
              .getItemsPedido()
              .map((i) => ({ productoId: i.productoId, cantidad: i.cantidad })),
            comboId: this.compra.getComboId(),
            cantidadCombos: this.compra.getCantidadCombos(),
            canjes: usuario ? this.compra.getCanjes() : [],
            nacimientoInvitado:
              nacimientoIso(this.compra.getFechaNacimientoInvitado() ?? '') ?? null,
            codigoCupon: codigoCupon ?? null,
            totalEsperado: totalEsperado ?? precio.total,
            puntosEsperados: puntosEsperados ?? precio.puntosUsados,
            usarCredito,
            creditoEsperado,
          },
        });
        if (error)
          return this.error(
            error.code === '23505'
              ? 'Una de las butacas ya está ocupada. Elegí nuevamente.'
              : mensajeServidor(
                  error,
                  'No se pudo confirmar la compra. Revisá su estado antes de volver a intentarlo.',
                ),
          );
        if (!data?.entrada?.codigo)
          return this.error('No se recibió la confirmación de la compra.');
        const venta = data as Venta;
        this.candy.limpiarPedido();
        this.compra.limpiarCompra();
        try {
          await this.usuarios.actualizarPerfil();
        } catch {
          /* La compra ya está aprobada; el saldo se refresca al abrir el perfil. */
        }
        return { valido: true, mensaje: 'Compra aprobada.', venta };
      } catch (error) {
        return this.error(
          mensajeServidor(error, 'No se pudo guardar la compra. Intentá nuevamente.'),
        );
      }
    });
  }

  async buscarCodigo(texto: string): Promise<Venta | undefined> {
    const codigo = this.normalizarCodigo(texto);
    if (!codigo) return undefined;

    const { data, error } = await this.supabase.cliente.rpc('buscar_venta_por_codigo', {
      p_codigo: codigo,
    });
    if (error) {
      console.error('Error al buscar la compra:', error);
      throw new Error(
        error.code === '42501'
          ? 'Se necesita una cuenta de empleado.'
          : 'No se pudo consultar la compra. Revisá la conexión e intentá nuevamente.',
      );
    }
    return (data as Venta | null) ?? undefined;
  }

  async getMisCompras(): Promise<Venta[]> {
    const { data, error } = await this.supabase.cliente.rpc('mis_compras');
    if (error)
      throw new Error(
        mensajeServidor(error, 'No se pudo cargar tu historial de compras. Intentá nuevamente.'),
      );
    return (data ?? []) as Venta[];
  }
  async cancelarCompra(codigo: string): Promise<Venta> {
    const { data, error } = await this.supabase.cliente.rpc('cancelar_compra', {
      p_codigo: codigo,
    });
    if (error)
      throw new Error(mensajeServidor(error, 'No se pudo cancelar la compra. Intentá nuevamente.'));
    if (!data?.cancelacion) throw new Error('No se recibió la confirmación de la cancelación.');
    try {
      await this.usuarios.actualizarPerfil();
    } catch {
      /* La cancelación ya está confirmada; el perfil permite refrescar el saldo. */
    }
    return data as Venta;
  }

  async validarCodigo(texto: string, sector: SectorValidacion): Promise<ResultadoVenta> {
    const codigo = this.normalizarCodigo(texto);
    if (!codigo) return this.error('Ingresá un código válido.');

    const { data, error } = await this.supabase.cliente.rpc('validar_venta_por_codigo', {
      p_codigo: codigo,
      p_sector: sector,
    });
    if (error) {
      console.error('Error al validar la compra:', error);
      return this.error(
        error.code === '42501'
          ? 'Se necesita una cuenta de empleado.'
          : 'No se pudo guardar la validación. Intentá nuevamente.',
      );
    }
    if (!data || typeof data.valido !== 'boolean' || typeof data.mensaje !== 'string') {
      return this.error('No se recibió la confirmación de la validación. Intentá nuevamente.');
    }

    const resultado = data as ResultadoVenta;
    return resultado.valido
      ? resultado
      : {
          ...resultado,
          mensaje: mensajeServidor(
            resultado.mensaje,
            'No se pudo validar el código. Intentá nuevamente.',
          ),
        };
  }

  private normalizarCodigo(texto: string): string {
    let codigo = texto.trim();
    // Los PDFs anteriores incluían un JSON. Solo se extrae su código.
    if (codigo.startsWith('{')) {
      try {
        const datos: unknown = JSON.parse(codigo);
        codigo =
          typeof datos === 'object' &&
          datos !== null &&
          'codigo' in datos &&
          typeof datos.codigo === 'string'
            ? datos.codigo
            : '';
      } catch {
        return '';
      }
    }
    return codigo.trim().toUpperCase();
  }

  private error(mensaje: string): ResultadoVenta {
    return { valido: false, mensaje };
  }
}
