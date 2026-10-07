import { mensajeServidor } from '../utils/errores';
import { inject, Injectable, signal } from '@angular/core';
import { Pelicula } from '../models/pelicula';
import { Supabase } from './supabase';
import { estadoVenta, fechaArgentina, sumarDias } from '../utils/estrenos';

interface PeliculaSupabase {
  fecha_estreno?: string;
  preventa_habilitada?: boolean;
  precio_preventa?: number;
  dias_preventa?: number;
  id: number;
  nombre: string;
  sinopsis: string;
  duracion_minutos: number;
  imagen_url: string;
  generos: string[];
  edad_minima: Pelicula['edadMinima'];
  cantidad_vendida: number;
  en_cartelera: boolean;
}

@Injectable({ providedIn: 'root' })
export class Peliculas {
  private supabase = inject(Supabase);
  private peliculas = signal<Pelicula[]>([]);

  getTodasLasPeliculas(): Pelicula[] {
    return this.peliculas();
  }

  getPeliculas(): Pelicula[] {
    return this.peliculas().filter((p) => estadoVenta(p) === 'cartelera');
  }

  getProximamente(): Pelicula[] {
    const hoy = fechaArgentina();
    return this.peliculas()
      .filter(
        (p) =>
          p.activa !== false &&
          p.fechaEstreno &&
          p.fechaEstreno > hoy &&
          p.fechaEstreno <= sumarDias(hoy, 42),
      )
      .sort((a, b) => a.fechaEstreno!.localeCompare(b.fechaEstreno!));
  }

  getPeliculaPorId(id: number): Pelicula | undefined {
    return this.peliculas().find((p) => p.id === id);
  }

  getGeneros(): string[] {
    return [...new Set(this.getPeliculas().flatMap((p) => p.generos))].sort();
  }

  getPeliculasMasVendidas(): Pelicula[] {
    return [...this.getPeliculas()]
      .sort((a, b) => b.cantidadVendida - a.cantidadVendida || a.nombre.localeCompare(b.nombre))
      .slice(0, 3);
  }

  async cargar(): Promise<void> {
    const { data, error } = await this.supabase.cliente
      .from('peliculas')
      .select('*')
      .order('nombre');
    if (error) throw new Error('No se pudieron consultar las películas.');
    this.peliculas.set((data as PeliculaSupabase[]).map((p) => this.convertir(p)));
  }


  async getPeliculasDesdeSupabase(): Promise<Pelicula[]> {
    await this.cargar();
    return this.getPeliculas();
  }

  async getPeliculaPorIdDesdeSupabase(id: number): Promise<Pelicula | undefined> {
    const { data, error } = await this.supabase.cliente
      .from('peliculas')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error('No se pudo consultar la película.');
    return data ? this.convertir(data as PeliculaSupabase) : undefined;
  }

  async guardarPelicula(
    datos: Omit<Pelicula, 'id' | 'cantidadVendida'>,
    id?: number,
  ): Promise<boolean> {
    if (
      !datos.nombre.trim() ||
      !datos.sinopsis.trim() ||
      !Number.isInteger(datos.duracionMinutos) ||
      datos.duracionMinutos < 1 ||
      ![0, 13, 16, 18].includes(datos.edadMinima) ||
      !datos.generos.length ||
      !/^https?:\/\//.test(datos.imagenUrl) ||
      (datos.fechaEstreno && !/^\d{4}-\d{2}-\d{2}$/.test(datos.fechaEstreno)) ||
      (datos.preventaHabilitada &&
        (!datos.fechaEstreno ||
          !Number.isInteger(datos.precioPreventa) ||
          (datos.precioPreventa ?? 0) <= 0)) ||
      !Number.isInteger(datos.diasPreventa ?? 7) ||
      (datos.diasPreventa ?? 7) < 1 ||
      (datos.diasPreventa ?? 7) > 60
    )
      return false;
    const fila = {
      fecha_estreno: datos.fechaEstreno || null,
      preventa_habilitada: datos.preventaHabilitada ?? false,
      precio_preventa: datos.precioPreventa ?? null,
      dias_preventa: datos.diasPreventa ?? 7,
      nombre: datos.nombre.trim(),
      sinopsis: datos.sinopsis.trim(),
      duracion_minutos: datos.duracionMinutos,
      imagen_url: datos.imagenUrl.trim(),
      generos: datos.generos,
      edad_minima: datos.edadMinima,
      en_cartelera: datos.activa !== false,
    };
    const tabla = this.supabase.cliente.from('peliculas');
    const { error } =
      id === undefined ? await tabla.insert(fila) : await tabla.update(fila).eq('id', id);
    if (error)
      throw new Error(
        mensajeServidor(error, 'No se pudo guardar la película. Intentá nuevamente.'),
      );
    await this.cargar();
    return true;
  }

  async eliminarPelicula(id: number): Promise<void> {
    const { error } = await this.supabase.cliente.from('peliculas').delete().eq('id', id);
    if (error)
      throw new Error(
        mensajeServidor(error, 'No se pudo eliminar la película. Intentá nuevamente.'),
      );
    await this.cargar();
  }

  private convertir(p: PeliculaSupabase): Pelicula {
    return {
      fechaEstreno: p.fecha_estreno ?? undefined,
      preventaHabilitada: p.preventa_habilitada ?? false,
      precioPreventa: p.precio_preventa != null ? Number(p.precio_preventa) : undefined,
      diasPreventa: p.dias_preventa ?? 7,
      id: p.id,
      nombre: p.nombre,
      sinopsis: p.sinopsis,
      duracionMinutos: p.duracion_minutos,
      imagenUrl: p.imagen_url,
      generos: p.generos,
      edadMinima: p.edad_minima,
      cantidadVendida: Number(p.cantidad_vendida),
      activa: p.en_cartelera,
    };
    
  }
}
