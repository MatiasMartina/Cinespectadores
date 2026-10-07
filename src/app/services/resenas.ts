import { mensajeServidor } from '../utils/errores';
import { inject, Injectable, signal } from '@angular/core';
import { Resena } from '../models/resena';
import { Supabase } from './supabase';
@Injectable({ providedIn: 'root' })
export class Resenas {
  private supabase = inject(Supabase);
  private resenas = signal<Resena[]>([]);
  async cargar(peliculaId: number): Promise<void> {
    const { data, error } = await this.supabase.cliente
      .from('resenas')
      .select('*')
      .eq('pelicula_id', peliculaId)
      .order('fecha', { ascending: false });
    if (error) throw new Error('No se pudieron cargar las reseñas.');
    this.resenas.set(
      data.map((r) => ({
        id: r.id,
        peliculaId: r.pelicula_id,
        nombreUsuario: r.nombre_usuario,
        puntaje: r.puntaje,
        comentario: r.comentario,
        fecha: r.fecha,
      })),
    );
  }
  getResenasPorPeliculaId(id: number): Resena[] {
    return this.resenas().filter((r) => r.peliculaId === id);
  }
  getPuntajePromedio(id: number): number | undefined {
    const lista = this.getResenasPorPeliculaId(id);
    return lista.length
      ? Math.round((lista.reduce((t, r) => t + r.puntaje, 0) / lista.length) * 10) / 10
      : undefined;
  }
  async agregarResena(
    peliculaId: number,
    _nombre: string,
    puntaje: number,
    comentario: string,
  ): Promise<void> {
    if (!Number.isInteger(puntaje) || puntaje < 1 || puntaje > 5)
      throw new Error('Elegí un puntaje entero entre 1 y 5 estrellas.');
    if (!comentario.trim()) throw new Error('Escribí un comentario para publicar la reseña.');
    if (comentario.trim().length > 300)
      throw new Error('El comentario debe tener como máximo 300 caracteres.');
    const { error } = await this.supabase.cliente.rpc('guardar_resena', {
      p_pelicula_id: peliculaId,
      p_puntaje: puntaje,
      p_comentario: comentario.trim(),
    });
    if (error)
      throw new Error(mensajeServidor(error, 'No se pudo guardar la reseña. Intentá nuevamente.'));
    await this.cargar(peliculaId);
  }
}
