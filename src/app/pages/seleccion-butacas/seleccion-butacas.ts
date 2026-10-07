import { mensajeServidor } from '../../utils/errores';
import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Butaca } from '../../models/butaca';
import { FilaButacas } from '../../models/fila-butacas';
import { Funcion } from '../../models/funcion';
import { Pelicula } from '../../models/pelicula';
import { MapaButacas } from '../../components/mapa-butacas/mapa-butacas';
import { FechaNacimiento } from '../../components/fecha-nacimiento/fecha-nacimiento';
import { Butacas } from '../../services/butacas';
import { Compra } from '../../services/compra';
import { Funciones } from '../../services/funciones';
import { Peliculas } from '../../services/peliculas';
import { Usuarios } from '../../services/usuarios';
import { nacimientoIso } from '../../utils/fechas';

@Component({
  selector: 'app-seleccion-butacas',
  imports: [MapaButacas, FormsModule, FechaNacimiento],
  templateUrl: './seleccion-butacas.html',
  styleUrl: './seleccion-butacas.css',
})
export class SeleccionButacas implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private funcionesService = inject(Funciones);
  private butacasService = inject(Butacas);
  private compraService = inject(Compra);
  private peliculasService = inject(Peliculas);
  private usuariosService = inject(Usuarios);

  private dejarDeEscucharButacas?: () => void;
  private consultaButacas = 0;
  private destruido = false;

  funcion?: Funcion;
  pelicula?: Pelicula;
  filas: FilaButacas[] = [];
  butacasSeleccionadas: string[] = [];
  butacasOcupadas = signal<string[]>([]);
  mensajeError = '';
  modoEdicion = false;
  cargando = signal(true);
  mensajeCarga = signal('');
  disponibilidadValida = signal(false);
  fechaNacimientoInvitado = '';

  get usuarioActual() {
    return this.usuariosService.getUsuarioActual();
  }

  get edadInvitadoYaValidada(): boolean {
    return (
      !this.usuarioActual &&
      (this.pelicula?.edadMinima ?? 0) > 0 &&
      nacimientoIso(this.compraService.getFechaNacimientoInvitado() ?? '') !== undefined &&
      this.usuariosService.calcularEdad(this.compraService.getFechaNacimientoInvitado() ?? '') >=
        (this.pelicula?.edadMinima ?? 0)
    );
  }

  get requiereFechaNacimientoInvitado(): boolean {
    return (
      !this.usuarioActual && (this.pelicula?.edadMinima ?? 0) > 0 && !this.edadInvitadoYaValidada
    );
  }

  async ngOnInit(): Promise<void> {
    try {
      await Promise.all([
        this.butacasService.cargarSalasYPrecios(),
        this.usuariosService.esperarSesion(),
      ]);
      const id = Number(this.route.snapshot.paramMap.get('id'));

      this.modoEdicion = this.route.snapshot.queryParamMap.get('editar') === 'true';

      this.fechaNacimientoInvitado = this.compraService.getFechaNacimientoInvitado() ?? '';

      this.funcion = await this.funcionesService.getFuncionPorIdDesdeSupabase(id);

      if (this.funcion) {
        this.pelicula = await this.peliculasService.getPeliculaPorIdDesdeSupabase(
          this.funcion.peliculaId,
        );
      }

      const compraGuardada = this.compraService.getFuncion();

      if (compraGuardada?.id === id) {
        this.butacasSeleccionadas = this.compraService.getButacasSeleccionadas();
      }

      if (this.funcion && !this.destruido) {
        this.dejarDeEscucharButacas = this.butacasService.escucharButacasOcupadas(id, () => {
          void this.actualizarButacasOcupadas(id);
        });

        await this.actualizarButacasOcupadas(id);
      }

      this.filas = this.butacasService.getFilasButacas(this.funcion?.salaNumero);

      this.cargando.set(false);
    } catch (error) {
      this.mensajeCarga.set(mensajeServidor(error, 'No se pudieron cargar los datos.'));
    } finally {
      if (!this.destruido) this.cargando.set(false);
    }
  }

  private async actualizarButacasOcupadas(funcionId: number): Promise<void> {
    try {
      const consulta = ++this.consultaButacas;

      const ocupadas = await this.butacasService.getButacasOcupadasDesdeSupabase(funcionId);

      if (this.destruido || consulta !== this.consultaButacas) {
        return;
      }

      const cantidadAnterior = this.butacasSeleccionadas.length;

      this.butacasSeleccionadas = this.butacasSeleccionadas.filter((id) => !ocupadas.includes(id));

      this.butacasOcupadas.set(ocupadas);

      if (this.butacasSeleccionadas.length < cantidadAnterior) {
        this.mensajeError = 'Una de tus butacas fue ocupada por otra compra. Elegí otra.';
      }
      this.disponibilidadValida.set(true);
      this.mensajeCarga.set('');
    } catch (error) {
      if (!this.destruido) {
        this.disponibilidadValida.set(false);
        this.mensajeCarga.set(mensajeServidor(error, 'No se pudo cargar la disponibilidad.'));
      }
    }
  }

  ngOnDestroy(): void {
    this.destruido = true;
    this.dejarDeEscucharButacas?.();
  }

  seleccionarButaca(butaca: Butaca): void {
    if (this.estaOcupada(butaca) || butaca.habilitada === false) {
      return;
    }

    if (this.estaSeleccionada(butaca)) {
      this.quitarButacaSeleccionada(butaca.id);
    } else {
      this.butacasSeleccionadas = [...this.butacasSeleccionadas, butaca.id];
    }
  }

  estaSeleccionada(butaca: Butaca): boolean {
    return this.butacasSeleccionadas.includes(butaca.id);
  }

  estaOcupada(butaca: Butaca): boolean {
    return this.butacasOcupadas().includes(butaca.id);
  }

  getCantidadButacasSeleccionadas(): number {
    return this.butacasSeleccionadas.length;
  }

  getTotal(): number {
    if (!this.funcion) {
      return 0;
    }

    return this.butacasService.calcularTotal(
      this.funcion.precio,
      this.butacasSeleccionadas,
      this.funcion.salaNumero,
    );
  }

  getPrecioButacaSeleccionada(idButaca: string): number {
    if (!this.funcion) {
      return 0;
    }

    return this.butacasService.getPrecioButaca(
      this.funcion.precio,
      idButaca,
      this.funcion.salaNumero,
    );
  }

  confirmarCompra(): void {
    if (
      !this.funcion ||
      !this.pelicula ||
      !this.disponibilidadValida() ||
      this.butacasSeleccionadas.length === 0
    ) {
      return;
    }

    const usuarioActual = this.usuarioActual;
    const pelicula = this.pelicula;

    let edadUsuario: number | undefined;

    if (usuarioActual) {
      edadUsuario = this.usuariosService.calcularEdadUsuarioActual();
    } else if (pelicula && pelicula.edadMinima > 0) {
      const iso = nacimientoIso(this.fechaNacimientoInvitado);

      if (!iso) {
        alert('Ingresá una fecha de nacimiento válida.');
        return;
      }

      edadUsuario = this.usuariosService.calcularEdad(iso);
    }

    if (
      pelicula &&
      pelicula.edadMinima > 0 &&
      (edadUsuario === undefined ||
        !Number.isFinite(edadUsuario) ||
        edadUsuario < pelicula.edadMinima)
    ) {
      alert(`No cumplís la edad mínima (${pelicula.edadMinima} años) para ver esta película.`);
      return;
    }

    if (!usuarioActual && pelicula && pelicula.edadMinima > 0) {
      this.compraService.guardarFechaNacimientoInvitado(this.fechaNacimientoInvitado);
    }

    this.compraService.guardarCompra(this.funcion, this.butacasSeleccionadas);

    if (this.modoEdicion) {
      this.router.navigate(['/confirmacion']);
    } else {
      this.router.navigate(['/candy-bar']);
    }
  }

  quitarButacaSeleccionada(idButaca: string): void {
    this.butacasSeleccionadas = this.butacasSeleccionadas.filter((id) => id !== idButaca);
  }

  volver(): void {
    if (!this.funcion) {
      this.router.navigate(['/']);
      return;
    }

    if (this.modoEdicion) {
      const funcionPendiente = this.compraService.getFuncionPendiente();

      if (funcionPendiente) {
        this.router.navigate(['/pelicula', funcionPendiente.peliculaId], {
          queryParams: { editar: true },
        });
      } else {
        this.router.navigate(['/confirmacion']);
      }

      return;
    }

    this.router.navigate(['/pelicula', this.funcion.peliculaId]);
  }

  getPrecioExtraVip(): number {
    return this.butacasService.getPrecioExtraVip();
  }
}
