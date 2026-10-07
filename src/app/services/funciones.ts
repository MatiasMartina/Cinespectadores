import { mensajeServidor } from '../utils/errores';
import { inject, Injectable, signal } from '@angular/core';
import { Funcion } from '../models/funcion';
import { Peliculas } from './peliculas';
import { Salas } from './salas';
import { fechaLocal, fechaHoraValida } from '../utils/fechas';
import { Supabase } from './supabase';
import { estadoVenta, precioVigente } from '../utils/estrenos';

export type DatosFuncion = Omit<Funcion, 'id' | 'salaNumero'>;
export interface ResultadoProgramacion {
  valido: boolean;
  mensaje: string;
  funciones: Funcion[];
}

interface FuncionSupabase {
  id: number;
  pelicula_id: number;
  sala_numero: number;
  fecha: string;
  hora: string;
  formato: Funcion['formato'];
  idioma: Funcion['idioma'];
  precio: number;
}

@Injectable({ providedIn: 'root' })
export class Funciones {
  private peliculas = inject(Peliculas);
  private salas = inject(Salas);
  private supabase = inject(Supabase);
  private funciones = signal<Funcion[]>([]);

  getFunciones(): Funcion[] {
    return this.funciones();
  }
  async cargar(): Promise<void> {
    const { data, error } = await this.supabase.cliente
      .from('funciones')
      .select('*')
      .order('fecha')
      .order('hora');
    if (error) throw new Error('No se pudieron consultar las funciones.');
    this.funciones.set((data as FuncionSupabase[]).map((f) => this.convertir(f)));
  }
  private convertir(f: FuncionSupabase): Funcion {
    return {
      id: f.id,
      peliculaId: f.pelicula_id,
      salaNumero: f.sala_numero,
      fecha: f.fecha,
      hora: f.hora.slice(0, 5),
      formato: f.formato,
      idioma: f.idioma,
      precio: Number(f.precio),
    };
  }
  private async preparar(): Promise<void> {
    await Promise.all([this.cargar(), this.peliculas.cargar(), this.salas.cargar()]);
  }
  private async guardarLote(funciones: Funcion[], id?: number): Promise<ResultadoProgramacion> {
    const filas = funciones.map((f) => ({
      pelicula_id: f.peliculaId,
      sala_numero: f.salaNumero,
      fecha: f.fecha,
      hora: f.hora,
      formato: f.formato,
      idioma: f.idioma,
      precio: f.precio,
    }));
    const tabla = this.supabase.cliente.from('funciones');
    const { data, error } =
      id === undefined
        ? await tabla.insert(filas).select('*')
        : await tabla.update(filas[0]).eq('id', id).select('*');
    if (error)
      return {
        valido: false,
        mensaje: error.message.includes('cruce')
          ? 'Los horarios cambiaron. Otra función ocupa esa sala. Revisá la programación.'
          : mensajeServidor(error, 'No se pudo guardar la programación. Intentá nuevamente.'),
        funciones: [],
      };
    await this.cargar();
    return {
      valido: true,
      mensaje: 'Programación guardada con 30 minutos de separación.',
      funciones: (data as FuncionSupabase[]).map((f) => this.convertir(f)),
    };
  }
  getFuncionesPorPeliculaId(peliculaId: number): Funcion[] {
    return this.getFunciones()
      .filter(
        (funcion) =>
          funcion.peliculaId === peliculaId &&
          (fechaHoraValida(funcion.fecha, funcion.hora) ?? 0) > Date.now(),
      )
      .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.hora.localeCompare(b.hora));
  }
  getFuncionPorId(id: number): Funcion | undefined {
    return this.getFunciones().find((funcion) => funcion.id === id);
  }

  horarioDisponible(nueva: Omit<Funcion, 'id'>, funcionEditadaId?: number): boolean {
    return this.disponibleEn(nueva, this.getFunciones(), funcionEditadaId);
  }

  private disponibleEn(
    nueva: Omit<Funcion, 'id'>,
    funciones: Funcion[],
    ignorarId?: number,
  ): boolean {
    const pelicula = this.peliculas.getPeliculaPorId(nueva.peliculaId);
    const sala = this.salas.getSala(nueva.salaNumero);
    const inicio = fechaHoraValida(nueva.fecha, nueva.hora);
    if (
      !pelicula ||
      pelicula.activa === false ||
      !sala?.activa ||
      !sala.formatos.includes(nueva.formato) ||
      inicio === undefined ||
      (!!pelicula.fechaEstreno && nueva.fecha < pelicula.fechaEstreno) ||
      !Number.isFinite(nueva.precio) ||
      nueva.precio <= 0 ||
      !['Castellano', 'Subtitulada'].includes(nueva.idioma)
    )
      return false;
    const fin = inicio + (pelicula.duracionMinutos + 30) * 60000;
    return funciones.every((existente) => {
      if (existente.id === ignorarId || existente.salaNumero !== nueva.salaNumero) return true;
      const anterior = this.peliculas.getPeliculaPorId(existente.peliculaId);
      const comienzo = fechaHoraValida(existente.fecha, existente.hora);
      if (!anterior || comienzo === undefined) return false;
      const final = comienzo + (anterior.duracionMinutos + 30) * 60000;
      return fin <= comienzo || inicio >= final;
    });
  }

  async agregarFuncion(datos: Omit<Funcion, 'id'>): Promise<Funcion | undefined> {
    await this.preparar();
    const nueva = { ...datos, id: 0 };
    if (!this.horarioDisponible(nueva)) return undefined;
    const resultado = await this.guardarLote([nueva]);
    return resultado.funciones[0];
  }
  async guardarAutomatica(datos: DatosFuncion, id?: number): Promise<ResultadoProgramacion> {
    await this.preparar();
    const funciones = this.getFunciones();
    const anterior = funciones.find((funcion) => funcion.id === id);
    const inicio = fechaHoraValida(datos.fecha, datos.hora);
    if (inicio === undefined || inicio <= Date.now())
      return { valido: false, mensaje: 'Elegí una fecha y hora futuras.', funciones: [] };
    if (id !== undefined && !anterior)
      return { valido: false, mensaje: 'La función ya no existe.', funciones: [] };
    const disponibles = this.salas
      .getSalas()
      .filter((sala) => sala.activa)
      .sort((a, b) => a.numero - b.numero);
    if (anterior)
      disponibles.sort(
        (a, b) =>
          Number(b.numero === anterior.salaNumero) - Number(a.numero === anterior.salaNumero),
      );
    const sala = disponibles.find((sala) =>
      this.disponibleEn({ ...datos, salaNumero: sala.numero }, funciones, id),
    );
    if (!sala)
      return {
        valido: false,
        mensaje:
          'No hay una sala disponible para ese horario y formato. Se requieren 30 minutos entre funciones.',
        funciones: [],
      };
    const nueva = {
      ...datos,
      salaNumero: sala.numero,
      id: id ?? Math.max(0, ...funciones.map((funcion) => funcion.id)) + 1,
    };
    return this.guardarLote([nueva], id);
  }

  async programarSemana(
    datos: Omit<DatosFuncion, 'fecha'>,
    desde: string,
    hasta: string,
    dias: number[],
  ): Promise<ResultadoProgramacion> {
    await this.preparar();
    const primerDia = fechaHoraValida(desde);
    const ultimoDia = fechaHoraValida(hasta);
    if (
      primerDia === undefined ||
      ultimoDia === undefined ||
      ultimoDia < primerDia ||
      ultimoDia - primerDia > 366 * 86400000 ||
      dias.length === 0 ||
      dias.some((dia) => !Number.isInteger(dia) || dia < 0 || dia > 6)
    )
      return {
        valido: false,
        mensaje: 'Revisá el rango de fechas y elegí al menos un día. El rango máximo es un año.',
        funciones: [],
      };
    const existentes = this.getFunciones();
    const nuevas: Funcion[] = [];
    const salas = this.salas
      .getSalas()
      .filter((sala) => sala.activa)
      .sort((a, b) => a.numero - b.numero);
    let id = Math.max(0, ...existentes.map((funcion) => funcion.id));
    const dia = new Date(primerDia);
    while (dia.getTime() <= ultimoDia) {
      if (dias.includes(dia.getDay())) {
        const fecha = fechaLocal(dia);
        if ((fechaHoraValida(fecha, datos.hora) ?? 0) <= Date.now())
          return {
            valido: false,
            mensaje: 'Todas las funciones deben estar en el futuro.',
            funciones: [],
          };
        const sala = salas.find((sala) =>
          this.disponibleEn({ ...datos, fecha, salaNumero: sala.numero }, [
            ...existentes,
            ...nuevas,
          ]),
        );
        if (!sala)
          return {
            valido: false,
            mensaje: `No hay sala libre el ${fecha} a las ${datos.hora}. No se creó ninguna función del lote.`,
            funciones: [],
          };
        nuevas.push({ ...datos, fecha, salaNumero: sala.numero, id: ++id });
      }
      dia.setDate(dia.getDate() + 1);
    }
    if (nuevas.length === 0)
      return {
        valido: false,
        mensaje: 'El rango no contiene los días seleccionados.',
        funciones: [],
      };
    return this.guardarLote(nuevas);
  }

  async eliminarFuncion(id: number): Promise<boolean> {
    const { error } = await this.supabase.cliente.from('funciones').delete().eq('id', id);
    if (error)
      throw new Error(
        mensajeServidor(error, 'No se pudo eliminar la función. Intentá nuevamente.'),
      );
    await this.cargar();
    return true;
  }
  duracionDisponible(peliculaId: number, duracion: number): boolean {
    const funciones = this.getFunciones();
    return funciones.every((funcion) => {
      if (funcion.peliculaId !== peliculaId) return true;
      const inicio = fechaHoraValida(funcion.fecha, funcion.hora) ?? 0;
      const fin = inicio + (duracion + 30) * 60000;
      return funciones.every((otra) => {
        if (otra.id === funcion.id || otra.salaNumero !== funcion.salaNumero) return true;
        const otraPelicula = this.peliculas.getPeliculaPorId(otra.peliculaId);
        const otroInicio = fechaHoraValida(otra.fecha, otra.hora) ?? 0;
        const otroFin =
          otroInicio +
          ((otra.peliculaId === peliculaId ? duracion : (otraPelicula?.duracionMinutos ?? 0)) +
            30) *
            60000;
        return fin <= otroInicio || inicio >= otroFin;
      });
    });
  }
  async getFuncionesPorPeliculaIdDesdeSupabase(peliculaId: number): Promise<Funcion[]> {
    const pelicula = await this.peliculas.getPeliculaPorIdDesdeSupabase(peliculaId);
    if (!pelicula || !['cartelera', 'preventa'].includes(estadoVenta(pelicula))) return [];
    const { data, error } = await this.supabase.cliente
      .from('funciones')
      .select('*')
      .eq('pelicula_id', peliculaId)
      .order('fecha')
      .order('hora');
    if (error) throw new Error('No se pudieron consultar las funciones.');
    return (data as FuncionSupabase[])
      .map((f) => precioVigente(this.convertir(f), pelicula))
      .filter(
        (f) =>
          (fechaHoraValida(f.fecha, f.hora) ?? 0) > Date.now() &&
          (!pelicula.fechaEstreno || f.fecha >= pelicula.fechaEstreno),
      );
  }
  async getFuncionPorIdDesdeSupabase(id: number): Promise<Funcion | undefined> {
    const { data, error } = await this.supabase.cliente
      .from('funciones')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error('No se pudo consultar la función.');
    if (!data) return undefined;
    const funcion = this.convertir(data as FuncionSupabase);
    const pelicula = await this.peliculas.getPeliculaPorIdDesdeSupabase(funcion.peliculaId);
    if (
      !pelicula ||
      !['cartelera', 'preventa'].includes(estadoVenta(pelicula)) ||
      (pelicula.fechaEstreno && funcion.fecha < pelicula.fechaEstreno)
    )
      return undefined;
    return precioVigente(funcion, pelicula);
  }
}
