import { mensajeServidor } from '../../utils/errores';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { PeliculaCard } from '../../components/pelicula-card/pelicula-card';
import { SharedModule } from '../../shared/shared.module';
import { CampoFormulario, DatosFormulario } from '../../models/campo-formulario';
import { Pelicula } from '../../models/pelicula';
import { Peliculas } from '../../services/peliculas';
import { estadoVenta } from '../../utils/estrenos';
import { Administracion } from '../../services/administracion';
import { fechaParaMostrar } from '../../utils/fechas';

@Component({
  selector: 'app-admin-peliculas',
  imports: [SharedModule, PeliculaCard],
  templateUrl: './admin-peliculas.html',
})
export class AdminPeliculas implements OnInit {
  fechaParaMostrar = fechaParaMostrar;
  estadoVenta = estadoVenta;
  nombresEstado = {
    cartelera: 'En cartelera',
    preventa: 'Preventa',
    proximamente: 'Próximamente',
    oculta: 'Oculta',
  };
  cargando = signal(true);
  procesando = signal(false);
  private peliculasService = inject(Peliculas);
  private admin = inject(Administracion);
  get peliculas() {
    return this.peliculasService.getTodasLasPeliculas();
  }
  editandoId?: number;
  valores: DatosFormulario = { activa: true, edadMinima: 0, diasPreventa: 7 };
  mensaje = signal('');
  error = signal(false);
  seccion = signal<'lista' | 'formulario'>('lista');
  busqueda = signal('');
  estado = signal('');
  borrador = signal<DatosFormulario>({});
  filtradas = computed(() =>
    this.peliculas.filter(
      (p) =>
        `${p.nombre} ${p.generos.join(' ')}`
          .toLocaleLowerCase('es')
          .includes(this.busqueda().trim().toLocaleLowerCase('es')) &&
        (!this.estado() || estadoVenta(p) === this.estado()),
    ),
  );
  vistaPrevia = computed<Pelicula>(() => {
    const d = this.borrador();
    const edad = Number(d['edadMinima'] ?? 0);
    return {
      id: this.editandoId ?? 0,
      cantidadVendida: 0,
      nombre: String(d['nombre'] ?? '').trim() || 'Título de la película',
      imagenUrl: String(d['imagenUrl'] ?? '').trim(),
      sinopsis: String(d['sinopsis'] ?? '').trim() || 'La sinopsis aparecerá acá.',
      generos: this.separarGeneros(String(d['generos'] ?? '')),
      duracionMinutos: Number(d['duracionMinutos'] ?? 0),
      edadMinima: ([0, 13, 16, 18].includes(edad) ? edad : 0) as Pelicula['edadMinima'],
      activa: d['activa'] === true,
      fechaEstreno: String(d['fechaEstreno'] ?? '') || undefined,
      preventaHabilitada: d['preventaHabilitada'] === true,
      precioPreventa: d['precioPreventa'] ? Number(d['precioPreventa']) : undefined,
      diasPreventa: Number(d['diasPreventa'] ?? 7),
    };
  });
  private separarGeneros(valor: string): string[] {
    const conocidos = this.peliculas.flatMap((p) => p.generos);
    const generos = valor
      .split(',')
      .map((g) => g.trim())
      .filter(Boolean)
      .map(
        (g) =>
          conocidos.find(
            (existente) => existente.toLocaleLowerCase('es') === g.toLocaleLowerCase('es'),
          ) ?? g,
      );
    return [...new Map(generos.map((g) => [g.toLocaleLowerCase('es'), g])).values()];
  }
  private actualizarGeneros(): void {
    const opciones = [...new Set(this.peliculas.flatMap((p) => p.generos))]
      .sort((a, b) => a.localeCompare(b, 'es'))
      .map((genero) => ({ valor: genero, etiqueta: genero }));
    this.campos = this.campos.map((campo) =>
      campo.nombre === 'generos' ? { ...campo, opciones } : campo,
    );
  }
  nueva(): void {
    this.cancelar();
    this.seccion.set('formulario');
  }
  async cambiarPublicacion(pelicula: Pelicula): Promise<void> {
    if (this.procesando()) return;
    this.procesando.set(true);
    try {
      const error = await this.admin.guardarPelicula(
        { ...pelicula, activa: pelicula.activa === false },
        pelicula.id,
      );
      this.error.set(!!error);
      this.mensaje.set(
        error || (pelicula.activa === false ? 'Película publicada.' : 'Película oculta.'),
      );
    } catch (error) {
      this.error.set(true);
      this.mensaje.set(mensajeServidor(error, 'No se pudo cambiar la publicación.'));
    } finally {
      this.procesando.set(false);
    }
  }
  async ngOnInit(): Promise<void> {
    try {
      await Promise.all([this.peliculasService.cargar()]);
      this.actualizarGeneros();
    } catch (error) {
      this.error.set(true);
      this.mensaje.set(mensajeServidor(error, 'No se pudieron cargar los datos.'));
    } finally {
      this.cargando.set(false);
    }
  }
  campos: CampoFormulario[] = [
    { nombre: 'nombre', etiqueta: 'Nombre', tipo: 'text', requerido: true, maximo: 150 },
    {
      nombre: 'duracionMinutos',
      etiqueta: 'Duración en minutos',
      tipo: 'number',
      entero: true,
      requerido: true,
      minimo: 1,
    },
    { nombre: 'imagenUrl', etiqueta: 'URL de la imagen', tipo: 'text', requerido: true },
    {
      nombre: 'generos',
      etiqueta: 'Géneros',
      tipo: 'generos',
      requerido: true,
      ayuda:
        'Elegí géneros existentes o escribí uno nuevo, separado por coma. Se incorpora al guardar.',
    },
    {
      nombre: 'edadMinima',
      etiqueta: 'Clasificación',
      tipo: 'select',
      requerido: true,
      opciones: [
        { valor: 0, etiqueta: 'ATP' },
        { valor: 13, etiqueta: '+13' },
        { valor: 16, etiqueta: '+16' },
        { valor: 18, etiqueta: '+18' },
      ],
    },
    { nombre: 'sinopsis', etiqueta: 'Sinopsis', tipo: 'textarea', requerido: true, maximo: 1000 },
    {
      nombre: 'fechaEstreno',
      etiqueta: 'Fecha de estreno',
      tipo: 'date',
      ayuda: 'La fecha determina Cartelera o Próximamente. Vacío: venta normal.',
    },
    { nombre: 'preventaHabilitada', etiqueta: 'Habilitar preventa', tipo: 'checkbox' },
    {
      nombre: 'precioPreventa',
      etiqueta: 'Precio de preventa',
      tipo: 'number',
      entero: true,
      minimo: 1,
    },
    {
      nombre: 'diasPreventa',
      etiqueta: 'Días antes del estreno',
      tipo: 'number',
      entero: true,
      minimo: 1,
      maximo: 60,
      requerido: true,
      ayuda: 'Por defecto 7. El día del estreno vuelve el precio normal de la función.',
    },
    { nombre: 'activa', etiqueta: 'Publicar película', tipo: 'checkbox' },
  ];
  editar(pelicula: Pelicula): void {
    this.seccion.set('formulario');
    this.editandoId = pelicula.id;
    this.valores = {
      ...pelicula,
      generos: pelicula.generos.join(', '),
      activa: pelicula.activa !== false,
      fechaEstreno: pelicula.fechaEstreno ?? '',
      preventaHabilitada: pelicula.preventaHabilitada ?? false,
      precioPreventa: pelicula.precioPreventa ?? null,
      diasPreventa: pelicula.diasPreventa ?? 7,
    };
    this.mensaje.set('');
  }
  cancelar(): void {
    this.editandoId = undefined;
    this.valores = { activa: true, edadMinima: 0, diasPreventa: 7 };
    this.borrador.set(this.valores);
    this.seccion.set('lista');
  }
  async guardar(datos: DatosFormulario): Promise<void> {
    if (this.procesando()) return;
    this.procesando.set(true);
    try {
      const error = await this.admin.guardarPelicula(
        {
          nombre: String(datos['nombre']).trim(),
          sinopsis: String(datos['sinopsis']).trim(),
          duracionMinutos: Number(datos['duracionMinutos']),
          imagenUrl: String(datos['imagenUrl']).trim(),
          generos: this.separarGeneros(String(datos['generos'])),
          edadMinima: Number(datos['edadMinima']) as Pelicula['edadMinima'],
          activa: datos['activa'] === true,
          fechaEstreno: String(datos['fechaEstreno'] ?? '') || undefined,
          preventaHabilitada: datos['preventaHabilitada'] === true,
          precioPreventa: datos['precioPreventa'] ? Number(datos['precioPreventa']) : undefined,
          diasPreventa: Number(datos['diasPreventa'] ?? 7),
        },
        this.editandoId,
      );
      this.error.set(!!error);
      this.mensaje.set(error || 'Película guardada.');
      if (!error) {
        this.actualizarGeneros();
        this.cancelar();
      }
    } catch (error) {
      this.error.set(true);
      this.mensaje.set(mensajeServidor(error, 'No se pudo guardar el cambio.'));
    } finally {
      this.procesando.set(false);
    }
  }
  async eliminar(pelicula: Pelicula): Promise<void> {
    if (this.procesando()) return;
    this.procesando.set(true);
    try {
      if (!confirm(`¿Eliminar ${pelicula.nombre}?`)) return;
      const error = await this.admin.eliminarPelicula(pelicula.id);
      this.error.set(!!error);
      this.mensaje.set(error || 'Película eliminada.');
    } catch (error) {
      this.error.set(true);
      this.mensaje.set(mensajeServidor(error, 'No se pudo guardar el cambio.'));
    } finally {
      this.procesando.set(false);
    }
  }
}
