import { mensajeServidor } from '../utils/errores';
import { inject, Injectable, signal } from '@angular/core';
import { Sala } from '../models/sala';
import { Butaca } from '../models/butaca';
import { Supabase } from './supabase';
import { crearButacasSala } from '../utils/butacas-sala';
@Injectable({ providedIn: 'root' })
export class Salas {
  private supabase = inject(Supabase);
  private salas = signal<Sala[]>([]);
  getSalas(): Sala[] {
    return this.salas();
  }
  getSala(numero: number): Sala | undefined {
    return this.salas().find((s) => s.numero === numero);
  }
  async cargar(): Promise<void> {
    const { data, error } = await this.supabase.cliente.from('salas').select('*').order('numero');
    if (error) throw new Error('No se pudieron consultar las salas.');
    this.salas.set(
      data.map((s) => ({
        id: s.id,
        numero: s.numero,
        nombre: s.nombre,
        activa: s.activa,
        formatos: s.formatos,
        butacas: s.butacas ?? crearButacasSala(),
      })),
    );
  }
  async guardarSala(datos: Omit<Sala, 'id' | 'butacas'>, id?: number): Promise<boolean> {
    if (
      !Number.isInteger(datos.numero) ||
      datos.numero < 1 ||
      !datos.nombre.trim() ||
      !datos.formatos.length ||
      datos.formatos.some((f) => !['2D', '3D', '4D', '5D'].includes(f))
    )
      return false;
    const tabla = this.supabase.cliente.from('salas');
    const fila = {
      numero: datos.numero,
      nombre: datos.nombre.trim(),
      activa: datos.activa,
      formatos: datos.formatos,
    };
    const { error } =
      id === undefined
        ? await tabla.insert({ ...fila, butacas: crearButacasSala() })
        : await tabla.update(fila).eq('id', id);
    if (error)
      throw new Error(mensajeServidor(error, 'No se pudo guardar la sala. Intentá nuevamente.'));
    await this.cargar();
    return true;
  }
  async eliminarSala(id: number): Promise<void> {
    const { error } = await this.supabase.cliente.from('salas').delete().eq('id', id);
    if (error)
      throw new Error(mensajeServidor(error, 'No se pudo eliminar la sala. Intentá nuevamente.'));
    await this.cargar();
  }
  async actualizarButacas(
    numero: number,
    ids: string[],
    tipo: Butaca['tipo'],
    habilitada: boolean,
  ): Promise<boolean> {
    await this.cargar();
    const sala = this.getSala(numero);
    if (!sala || !ids.length || ids.some((id) => !sala.butacas.some((b) => b.id === id)))
      return false;
    const butacas = sala.butacas.map((b) => (ids.includes(b.id) ? { ...b, tipo, habilitada } : b));
    const { error } = await this.supabase.cliente
      .from('salas')
      .update({ butacas })
      .eq('id', sala.id);
    if (error)
      throw new Error(
        mensajeServidor(error, 'No se pudieron actualizar las butacas. Intentá nuevamente.'),
      );
    await this.cargar();
    return true;
  }
}
