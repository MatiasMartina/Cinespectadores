import { mensajeServidor } from '../../utils/errores';
import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { PeliculaCard } from '../../components/pelicula-card/pelicula-card';
import { AvisoEstreno } from '../../components/aviso-estreno/aviso-estreno';
import { Peliculas } from '../../services/peliculas';
import { Pelicula } from '../../models/pelicula';
@Component({
  selector: 'app-proximamente',
  imports: [SharedModule, PeliculaCard, AvisoEstreno],
  templateUrl: './proximamente.html',
})
export class Proximamente implements OnInit {
  private servicio = inject(Peliculas);
  peliculas = signal<Pelicula[]>([]);
  busqueda = signal('');
  filtradas = computed(() =>
    this.peliculas().filter((p) =>
      p.nombre.toLowerCase().includes(this.busqueda().trim().toLowerCase()),
    ),
  );
  cargando = signal(true);
  mensaje = signal('');
  async ngOnInit(): Promise<void> {
    try {
      await this.servicio.cargar();
      this.peliculas.set(this.servicio.getProximamente());
    } catch (error) {
      this.mensaje.set(mensajeServidor(error, 'No se pudieron cargar los estrenos.'));
    } finally {
      this.cargando.set(false);
    }
  }
}
