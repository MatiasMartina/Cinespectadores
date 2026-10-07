import { mensajeServidor } from '../../utils/errores';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { SharedModule } from '../../shared/shared.module';
import { Funcion } from '../../models/funcion';
import { Funciones, DatosFuncion } from '../../services/funciones';
import { Peliculas } from '../../services/peliculas';
import { Administracion } from '../../services/administracion';
import { fechaLocal, fechaManualIso, fechaParaMostrar } from '../../utils/fechas';
import { validarFechaManual, validarHoraManual } from '../../utils/validadores-fecha';
import { rangoPeriodo } from '../../utils/estrenos';
import { Salas } from '../../services/salas';

@Component({
  selector: 'app-admin-funciones',
  imports: [SharedModule],
  templateUrl: './admin-funciones.html',
})
export class AdminFunciones implements OnInit {
  cargando = signal(true);
  procesando = signal(false);
  private funcionesService = inject(Funciones);
  private peliculasService = inject(Peliculas);
  private admin = inject(Administracion);
  private salasService = inject(Salas);
  fechaParaMostrar = fechaParaMostrar;
  seccion = signal<'lista' | 'formulario'>('lista');
  busqueda = signal('');
  sala = signal('');
  formatoFiltro = signal('');
  fechaFiltro = signal('');
  periodo = signal<'dia' | 'semana' | 'mes'>('dia');
  seleccionadas = signal<number[]>([]);
  get salas() {
    return this.salasService.getSalas();
  }
  filtradas = computed(() => {
    const fecha = fechaManualIso(this.fechaFiltro());
    if (this.fechaFiltro() && !fecha) return [];
    const rango = fecha
      ? this.periodo() === 'dia'
        ? { desde: fecha, hasta: fecha }
        : rangoPeriodo(fecha, this.periodo() === 'semana' ? 'semana' : 'mes')
      : undefined;
    return this.funciones.filter(
      (f) =>
        this.getPelicula(f.peliculaId)
          .toLocaleLowerCase('es')
          .includes(this.busqueda().trim().toLocaleLowerCase('es')) &&
        (!this.sala() || f.salaNumero === Number(this.sala())) &&
        (!this.formatoFiltro() || f.formato === this.formatoFiltro()) &&
        (!rango || (f.fecha >= rango.desde && f.fecha <= rango.hasta)),
    );
  });
  seleccionadasVisibles = computed(() =>
    this.filtradas().filter((f) => this.seleccionadas().includes(f.id)),
  );
  todasSeleccionadas = computed(
    () =>
      this.filtradas().length > 0 &&
      this.seleccionadasVisibles().length === this.filtradas().length,
  );
  get fechaFiltroInvalida(): boolean {
    return !!this.fechaFiltro() && !fechaManualIso(this.fechaFiltro());
  }
  nueva(): void {
    this.cancelar();
    this.seccion.set('formulario');
  }
  elegirFuncion(id: number): void {
    this.seleccionadas.update((ids) =>
      ids.includes(id) ? ids.filter((actual) => actual !== id) : [...ids, id],
    );
  }
  elegirTodas(): void {
    this.seleccionadas.set(this.todasSeleccionadas() ? [] : this.filtradas().map((f) => f.id));
  }
  limpiarFiltros(): void {
    this.busqueda.set('');
    this.sala.set('');
    this.formatoFiltro.set('');
    this.fechaFiltro.set('');
    this.periodo.set('dia');
    this.seleccionadas.set([]);
  }
  async eliminarSeleccionadas(): Promise<void> {
    const seleccion = [...this.seleccionadasVisibles()];
    if (
      this.procesando() ||
      !seleccion.length ||
      !confirm(
        `¿Eliminar las ${seleccion.length} funciones seleccionadas? Las funciones con ventas siguen protegidas.`,
      )
    )
      return;
    this.procesando.set(true);
    const fallos: string[] = [];
    let eliminadas = 0;
    try {
      for (const funcion of seleccion) {
        const error = await this.admin.eliminarFuncion(funcion.id);
        if (error)
          fallos.push(
            `${this.getPelicula(funcion.peliculaId)} (${fechaParaMostrar(funcion.fecha)} ${funcion.hora}): ${error}`,
          );
        else {
          eliminadas++;
          this.seleccionadas.update((ids) => ids.filter((id) => id !== funcion.id));
        }
      }
      this.error.set(fallos.length > 0);
      this.mensaje.set(
        `${eliminadas} funciones eliminadas.${fallos.length ? ' No se pudieron eliminar: ' + fallos.join(' · ') : ''}`,
      );
    } catch (error) {
      this.error.set(true);
      this.mensaje.set(
        `${eliminadas} funciones eliminadas. ${mensajeServidor(error, 'No se pudo completar la eliminación.')}`,
      );
    } finally {
      this.procesando.set(false);
    }
  }
  get peliculas() {
    return this.peliculasService.getTodasLasPeliculas();
  }
  get funciones() {
    return this.funcionesService.getFunciones();
  }
  editandoId?: number;
  modo: 'unica' | 'semanal' = 'unica';
  dias: number[] = [];
  diasSemana = [
    { id: 1, nombre: 'Lunes' },
    { id: 2, nombre: 'Martes' },
    { id: 3, nombre: 'Miércoles' },
    { id: 4, nombre: 'Jueves' },
    { id: 5, nombre: 'Viernes' },
    { id: 6, nombre: 'Sábado' },
    { id: 0, nombre: 'Domingo' },
  ];
  fechaMinima = fechaLocal(new Date());
  mensaje = signal('');
  error = signal(false);
  formulario = new FormGroup({
    peliculaId: new FormControl<number | null>(null, Validators.required),
    fecha: new FormControl(fechaParaMostrar(this.fechaMinima), {
      nonNullable: true,
      validators: [Validators.required, validarFechaManual(() => fechaLocal(new Date()))],
    }),
    hasta: new FormControl(fechaParaMostrar(this.fechaMinima), {
      nonNullable: true,
      validators: [Validators.required, validarFechaManual()],
    }),
    hora: new FormControl('18:00', {
      nonNullable: true,
      validators: [Validators.required, validarHoraManual],
    }),
    formato: new FormControl<Funcion['formato']>('2D', {
      nonNullable: true,
      validators: Validators.required,
    }),
    idioma: new FormControl<Funcion['idioma']>('Castellano', {
      nonNullable: true,
      validators: Validators.required,
    }),
    precio: new FormControl(8000, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1)],
    }),
  });
  async ngOnInit(): Promise<void> {
    try {
      await Promise.all([
        this.funcionesService.cargar(),
        this.peliculasService.cargar(),
        this.salasService.cargar(),
      ]);
    } catch (error) {
      this.error.set(true);
      this.mensaje.set(mensajeServidor(error, 'No se pudieron cargar los datos.'));
    } finally {
      this.cargando.set(false);
    }
  }
  elegirDia(dia: number): void {
    this.dias = this.dias.includes(dia)
      ? this.dias.filter((actual) => actual !== dia)
      : [...this.dias, dia];
  }
  editar(funcion: Funcion): void {
    this.seccion.set('formulario');
    this.editandoId = funcion.id;
    this.modo = 'unica';
    this.formulario.setValue({
      peliculaId: funcion.peliculaId,
      fecha: fechaParaMostrar(funcion.fecha),
      hasta: fechaParaMostrar(funcion.fecha),
      hora: funcion.hora,
      formato: funcion.formato,
      idioma: funcion.idioma,
      precio: funcion.precio,
    });
    this.mensaje.set('');
  }
  cancelar(): void {
    this.editandoId = undefined;
    this.dias = [];
    this.formulario.reset({
      peliculaId: null,
      fecha: fechaParaMostrar(fechaLocal(new Date())),
      hasta: fechaParaMostrar(fechaLocal(new Date())),
      hora: '18:00',
      formato: '2D',
      idioma: 'Castellano',
      precio: 8000,
    });
    this.seccion.set('lista');
  }
  async guardar(): Promise<void> {
    if (this.procesando()) return;
    this.procesando.set(true);
    try {
      if (
        this.formulario.controls.peliculaId.invalid ||
        this.formulario.controls.fecha.invalid ||
        this.formulario.controls.hora.invalid ||
        this.formulario.controls.formato.invalid ||
        this.formulario.controls.idioma.invalid ||
        this.formulario.controls.precio.invalid ||
        (this.modo === 'semanal' && this.formulario.controls.hasta.invalid)
      ) {
        this.formulario.markAllAsTouched();
        return;
      }
      const datos = this.formulario.getRawValue();
      const fecha = fechaManualIso(datos.fecha)!;
      const hasta = fechaManualIso(datos.hasta);
      if (
        this.modo === 'semanal' &&
        (!hasta ||
          hasta < fecha ||
          new Date(hasta).getTime() - new Date(fecha).getTime() > 366 * 86400000 ||
          !this.dias.length)
      ) {
        this.error.set(true);
        this.mensaje.set('Elegí al menos un día y un rango ordenado de hasta un año.');
        return;
      }
      const funcion: DatosFuncion = {
        peliculaId: Number(datos.peliculaId),
        fecha,
        hora: datos.hora,
        formato: datos.formato,
        idioma: datos.idioma,
        precio: datos.precio,
      };
      const resultado =
        this.modo === 'semanal' && this.editandoId === undefined
          ? await this.admin.programarSemana(funcion, fecha, hasta!, this.dias)
          : await this.admin.guardarFuncion(funcion, this.editandoId);
      this.error.set(!resultado.valido);
      this.mensaje.set(resultado.mensaje);
      if (resultado.valido) {
        this.cancelar();
      }
    } catch (error) {
      this.error.set(true);
      this.mensaje.set(mensajeServidor(error, 'No se pudo guardar el cambio.'));
    } finally {
      this.procesando.set(false);
    }
  }
  async eliminar(funcion: Funcion): Promise<void> {
    if (this.procesando()) return;
    this.procesando.set(true);
    try {
      if (!confirm(`¿Eliminar la función del ${funcion.fecha} a las ${funcion.hora}?`)) return;
      const error = await this.admin.eliminarFuncion(funcion.id);
      this.error.set(!!error);
      this.mensaje.set(error || 'Función eliminada.');
      if (!error) this.seleccionadas.update((ids) => ids.filter((id) => id !== funcion.id));
    } catch (error) {
      this.error.set(true);
      this.mensaje.set(mensajeServidor(error, 'No se pudo guardar el cambio.'));
    } finally {
      this.procesando.set(false);
    }
  }
  getPelicula(id: number): string {
    return this.peliculasService.getPeliculaPorId(id)?.nombre ?? 'Película no disponible';
  }
  getFin(funcion: Funcion): string {
    const inicio = new Date(`${funcion.fecha}T${funcion.hora}:00`);
    const duracion =
      this.peliculasService.getPeliculaPorId(funcion.peliculaId)?.duracionMinutos ?? 0;
    const libre = new Date(inicio.getTime() + (duracion + 30) * 60000);
    return `${fechaParaMostrar(fechaLocal(libre))} ${String(libre.getHours()).padStart(2, '0')}:${String(libre.getMinutes()).padStart(2, '0')}`;
  }
}
