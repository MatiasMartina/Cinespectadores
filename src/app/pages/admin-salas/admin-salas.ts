import { mensajeServidor } from '../../utils/errores';
import { Component, inject, OnInit, signal } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { CampoFormulario, DatosFormulario } from '../../models/campo-formulario';
import { Sala } from '../../models/sala';
import { Butaca } from '../../models/butaca';
import { Funcion } from '../../models/funcion';
import { Salas } from '../../services/salas';
import { Butacas } from '../../services/butacas';
import { Administracion } from '../../services/administracion';

@Component({
  selector: 'app-admin-salas',
  imports: [SharedModule],
  templateUrl: './admin-salas.html',
})
export class AdminSalas implements OnInit {
  cargando = signal(true);
  procesando = signal(false);
  private salasService = inject(Salas);
  private butacas = inject(Butacas);
  private admin = inject(Administracion);
  get salas() {
    return this.salasService.getSalas();
  }
  editandoId?: number;
  valores: DatosFormulario = { activa: true, formatos: '2D, 3D, 4D, 5D' };
  salaMapa?: Sala;
  filas = this.butacas.getFilasButacas();
  seleccionadas: string[] = [];
  tipo: Butaca['tipo'] = 'Comun';
  habilitada = true;
  mensaje = signal('');
  error = signal(false);
  async ngOnInit(): Promise<void> {
    try {
      await Promise.all([this.salasService.cargar()]);
    } catch (error) {
      this.error.set(true);
      this.mensaje.set(mensajeServidor(error, 'No se pudieron cargar los datos.'));
    } finally {
      this.cargando.set(false);
    }
  }
  campos: CampoFormulario[] = [
    {
      nombre: 'numero',
      etiqueta: 'Número de sala',
      tipo: 'number',
      entero: true,
      requerido: true,
      minimo: 1,
    },
    { nombre: 'nombre', etiqueta: 'Nombre', tipo: 'text', requerido: true, maximo: 80 },
    {
      nombre: 'formatos',
      anchoCompleto: true,
      etiqueta: 'Formatos separados por coma',
      tipo: 'text',
      requerido: true,
      ayuda: '2D, 3D, 4D, 5D. El sistema asigna salas compatibles.',
    },
    { nombre: 'activa', etiqueta: 'Sala habilitada', tipo: 'checkbox' },
  ];
  editar(sala: Sala): void {
    this.editandoId = sala.id;
    this.valores = {
      numero: sala.numero,
      nombre: sala.nombre,
      formatos: sala.formatos.join(', '),
      activa: sala.activa,
    };
  }
  cancelar(): void {
    this.editandoId = undefined;
    this.valores = { activa: true, formatos: '2D, 3D, 4D, 5D' };
  }
  async guardar(datos: DatosFormulario): Promise<void> {
    if (this.procesando()) return;
    this.procesando.set(true);
    try {
      const formatos = [
        ...new Set(
          String(datos['formatos'])
            .split(',')
            .map((formato) => formato.trim().toUpperCase()),
        ),
      ] as Funcion['formato'][];
      const error = await this.admin.guardarSala(
        {
          numero: Number(datos['numero']),
          nombre: String(datos['nombre']).trim(),
          formatos,
          activa: datos['activa'] === true,
        },
        this.editandoId,
      );
      this.mostrar(error, 'Sala guardada.');
      if (!error) this.cancelar();
    } catch (error) {
      this.error.set(true);
      this.mensaje.set(mensajeServidor(error, 'No se pudo guardar el cambio.'));
    } finally {
      this.procesando.set(false);
    }
  }
  async eliminar(sala: Sala): Promise<void> {
    if (this.procesando()) return;
    this.procesando.set(true);
    try {
      if (!confirm(`¿Eliminar ${sala.nombre}?`)) return;
      this.mostrar(await this.admin.eliminarSala(sala.id), 'Sala eliminada.');
      if (!this.salas.some((actual) => actual.id === this.salaMapa?.id)) this.salaMapa = undefined;
    } catch (error) {
      this.error.set(true);
      this.mensaje.set(mensajeServidor(error, 'No se pudo guardar el cambio.'));
    } finally {
      this.procesando.set(false);
    }
  }
  abrirMapa(sala: Sala): void {
    this.salaMapa = sala;
    this.filas = this.butacas.getFilasButacas(sala.numero);
    this.seleccionadas = [];
  }
  elegir(butaca: Butaca): void {
    this.seleccionadas = this.seleccionadas.includes(butaca.id)
      ? this.seleccionadas.filter((id) => id !== butaca.id)
      : [...this.seleccionadas, butaca.id];
  }
  async guardarButacas(): Promise<void> {
    if (this.procesando()) return;
    this.procesando.set(true);
    try {
      if (!this.salaMapa) return;
      const error = await this.admin.actualizarButacas(
        this.salaMapa.numero,
        this.seleccionadas,
        this.tipo,
        this.habilitada,
      );
      this.mostrar(error, 'Distribución actualizada.');
      if (!error) {
        this.abrirMapa(this.salasService.getSala(this.salaMapa.numero)!);
      }
    } catch (error) {
      this.error.set(true);
      this.mensaje.set(mensajeServidor(error, 'No se pudo guardar el cambio.'));
    } finally {
      this.procesando.set(false);
    }
  }
  getCapacidad(sala: Sala): number {
    return sala.butacas.filter((butaca) => butaca.habilitada !== false).length;
  }
  private mostrar(error: string, exito: string): void {
    this.error.set(!!error);
    this.mensaje.set(error || exito);
  }
}
