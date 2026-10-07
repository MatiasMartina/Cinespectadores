import { mensajeServidor } from '../../utils/errores';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PeliculaCard } from '../../components/pelicula-card/pelicula-card';
import { Pelicula } from '../../models/pelicula';
import { Peliculas } from '../../services/peliculas';
import { CarruselPeliculas } from '../../components/carrusel-peliculas/carrusel-peliculas';

@Component({
  selector: 'app-inicio',
  imports: [FormsModule, PeliculaCard, CarruselPeliculas],
  templateUrl: './inicio.html',
  styleUrl: './inicio.css',
})
export class Inicio implements OnInit {
  private peliculasService = inject(Peliculas);

  peliculas = signal<Pelicula[]>([]);
  peliculasMasVendidas = signal<Pelicula[]>([]);
  peliculasFiltradas = signal<Pelicula[]>([]);
  generos = signal<string[]>(['Todos']);

  busqueda = '';
  generoSeleccionado = 'Todos';
  generosSeleccionados: string[] = [];
  cargando = signal(true);
  mensaje = signal('');

  async ngOnInit(): Promise<void> {
    try {
      const peliculasObtenidas = await this.peliculasService.getPeliculasDesdeSupabase();

      this.peliculas.set(peliculasObtenidas);
      this.peliculasFiltradas.set(peliculasObtenidas);

      this.peliculasMasVendidas.set(this.peliculasService.getPeliculasMasVendidas());

      const generosEncontrados = [
        ...new Set(peliculasObtenidas.flatMap((pelicula) => pelicula.generos)),
      ].sort((generoA, generoB) => generoA.localeCompare(generoB));

      this.generos.set(['Todos', ...generosEncontrados]);
    } catch (error) {
      this.mensaje.set(mensajeServidor(error, 'No se pudo cargar la cartelera.'));
    } finally {
      this.cargando.set(false);
    }
  }
  elegirGenero(genero: string): void {
    this.generosSeleccionados = this.generosSeleccionados.includes(genero)
      ? this.generosSeleccionados.filter((g) => g !== genero)
      : [...this.generosSeleccionados, genero];
    this.filtrarPeliculas();
  }

  filtrarPeliculas(): void {
    const busquedaNormalizada = this.busqueda.toLowerCase().trim();

    const resultado = this.peliculas().filter((pelicula) => {
      const coincideNombre = pelicula.nombre.toLowerCase().includes(busquedaNormalizada);

      const coincideGenero =
        this.generosSeleccionados.length === 0 ||
        this.generosSeleccionados.some((g) => pelicula.generos.includes(g));

      return coincideNombre && coincideGenero;
    });

    this.peliculasFiltradas.set(resultado);
  }
}
