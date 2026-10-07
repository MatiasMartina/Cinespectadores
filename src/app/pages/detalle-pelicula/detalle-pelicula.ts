import { mensajeServidor } from '../../utils/errores';
import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FilaButacas } from '../../models/fila-butacas';
import { Funcion } from '../../models/funcion';
import { Pelicula } from '../../models/pelicula';
import { Resena } from '../../models/resena';
import { Usuario } from '../../models/usuario';
import { Butacas } from '../../services/butacas';
import { Funciones } from '../../services/funciones';
import { Peliculas } from '../../services/peliculas';
import { Resenas } from '../../services/resenas';
import { Usuarios } from '../../services/usuarios';
import { Compra } from '../../services/compra';
import { MapaButacas } from '../../components/mapa-butacas/mapa-butacas';
import { ResenasPelicula } from '../../components/resenas-pelicula/resenas-pelicula';
import { AvisoEstreno } from '../../components/aviso-estreno/aviso-estreno';
import { estadoVenta } from '../../utils/estrenos';

@Component({
  selector: 'app-detalle-pelicula',
  imports: [RouterLink, DatePipe, MapaButacas, ResenasPelicula, AvisoEstreno],
  templateUrl: './detalle-pelicula.html',
  styleUrl: './detalle-pelicula.css',
})
export class DetallePelicula implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private peliculasService = inject(Peliculas);
  private funcionesService = inject(Funciones);
  private resenasService = inject(Resenas);
  private usuariosService = inject(Usuarios);
  private butacasService = inject(Butacas);
  private compraService = inject(Compra);

  private dejarDeEscucharButacas?: () => void;
  private consultaButacas = 0;
  private destruido = false;

  pelicula = signal<Pelicula | undefined>(undefined);
  cargando = signal(true);
  mensajeCarga = signal('');
  disponibilidadValida = signal(false);
  funciones = signal<Funcion[]>([]);
  funcionSeleccionada?: Funcion;
  get resenas(): Resena[] {
    return this.resenasService.getResenasPorPeliculaId(this.pelicula()?.id ?? 0);
  }
  get puntajePromedio(): number | undefined {
    return this.resenasService.getPuntajePromedio(this.pelicula()?.id ?? 0);
  }
  filasButacas: FilaButacas[] = [];
  butacasOcupadas = signal<string[]>([]);
  modoEdicion = false;
  funcionOriginalId?: number;
  get estadoPelicula(): string {
    const pelicula = this.pelicula();
    return pelicula ? estadoVenta(pelicula) : 'oculta';
  }

  get usuarioActual(): Usuario | undefined {
    return this.usuariosService.getUsuarioActual();
  }

  async ngOnInit(): Promise<void> {
    try {
      await Promise.all([
        this.butacasService.cargarSalasYPrecios(),
        this.usuariosService.esperarSesion(),
      ]);
      const id = Number(this.route.snapshot.paramMap.get('id'));
      this.modoEdicion = this.route.snapshot.queryParamMap.get('editar') === 'true';

      if (this.modoEdicion) {
        const compraGuardada = this.compraService.getFuncion();
        this.funcionOriginalId = compraGuardada?.id;
      }

      const peliculaEncontrada = await this.peliculasService.getPeliculaPorIdDesdeSupabase(id);

      if (this.destruido) return;
      this.pelicula.set(peliculaEncontrada);

      const funcionesEncontradas =
        await this.funcionesService.getFuncionesPorPeliculaIdDesdeSupabase(id);

      if (this.destruido) return;
      this.funciones.set(funcionesEncontradas);

      await this.resenasService.cargar(id);

      if (this.funciones().length > 0) {
        const funcionParaMostrar = this.modoEdicion
          ? (this.compraService.getFuncionPendiente() ?? this.compraService.getFuncion())
          : undefined;

        const funcionInicial =
          this.funciones().find((funcion) => funcion.id === funcionParaMostrar?.id) ??
          this.funciones()[0];

        await this.seleccionarFuncion(funcionInicial);
      }
    } catch (error) {
      if (!this.destruido) {
        this.mensajeCarga.set(mensajeServidor(error, 'No se pudieron cargar los datos.'));
      }
    } finally {
      if (!this.destruido) this.cargando.set(false);
    }
  }

  async seleccionarFuncion(funcion: Funcion): Promise<void> {
    if (this.destruido) return;

    this.dejarDeEscucharButacas?.();
    this.dejarDeEscucharButacas = undefined;
    this.consultaButacas++;

    this.funcionSeleccionada = funcion;
    this.filasButacas = this.butacasService.getFilasButacas(funcion.salaNumero);

    if (this.modoEdicion && this.funcionOriginalId !== undefined) {
      const funcionPendiente = funcion.id === this.funcionOriginalId ? undefined : funcion;

      this.compraService.guardarFuncionPendiente(funcionPendiente);
    }

    this.disponibilidadValida.set(false);
    this.butacasOcupadas.set([]);

    this.dejarDeEscucharButacas = this.butacasService.escucharButacasOcupadas(funcion.id, () => {
      void this.actualizarButacasOcupadas(funcion.id);
    });

    await this.actualizarButacasOcupadas(funcion.id);
  }

  private async actualizarButacasOcupadas(funcionId: number): Promise<void> {
    const consulta = ++this.consultaButacas;
    try {
      const ocupadas = await this.butacasService.getButacasOcupadasDesdeSupabase(funcionId);

      if (
        this.destruido ||
        consulta !== this.consultaButacas ||
        this.funcionSeleccionada?.id !== funcionId
      ) {
        return;
      }

      this.butacasOcupadas.set(ocupadas);
      this.disponibilidadValida.set(true);
      this.mensajeCarga.set('');
    } catch (error) {
      if (
        !this.destruido &&
        consulta === this.consultaButacas &&
        this.funcionSeleccionada?.id === funcionId
      ) {
        this.disponibilidadValida.set(false);
        this.mensajeCarga.set(mensajeServidor(error, 'No se pudo cargar la disponibilidad.'));
      }
    }
  }

  ngOnDestroy(): void {
    this.destruido = true;
    this.consultaButacas++;
    this.dejarDeEscucharButacas?.();
  }

  estaOcupada(idButaca: string): boolean {
    return this.butacasOcupadas().includes(idButaca);
  }

  async agregarResena(datos: { puntaje: number; comentario: string }): Promise<void> {
    const pelicula = this.pelicula();
    const usuario = this.usuarioActual;
    const comentario = datos.comentario.trim();

    if (comentario.length > 300) {
      alert('La reseña debe tener como máximo 300 caracteres.');
      return;
    }

    if (!pelicula || !usuario || !comentario) {
      return;
    }

    if (!Number.isInteger(datos.puntaje) || datos.puntaje < 1 || datos.puntaje > 5) {
      alert('Seleccioná un puntaje entero entre 1 y 5.');
      return;
    }

    try {
      await this.resenasService.agregarResena(
        pelicula.id,
        `${usuario.nombre} ${usuario.apellido}`,
        datos.puntaje,
        comentario,
      );
    } catch (error) {
      alert(mensajeServidor(error, 'No se pudo guardar la reseña.'));
    }
  }

  funcionFueCambiada(): boolean {
    if (!this.modoEdicion || this.funcionOriginalId === undefined) {
      return false;
    }

    return this.funcionSeleccionada?.id !== this.funcionOriginalId;
  }
}
