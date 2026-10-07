import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CalificacionEstrellas } from '../calificacion-estrellas/calificacion-estrellas';
import { Resena } from '../../models/resena';
import { Usuario } from '../../models/usuario';

@Component({
  selector: 'app-resenas-pelicula',
  imports: [FormsModule, RouterLink, CalificacionEstrellas],
  templateUrl: './resenas-pelicula.html',
  styleUrl: './resenas-pelicula.css',
})
export class ResenasPelicula {
  resenas = input<Resena[]>([]);
  puntajePromedio = input<number | undefined>();
  usuarioActual = input<Usuario | undefined>();
  resenaPublicada = output<{ puntaje: number; comentario: string }>();
  nuevoPuntaje = 5;
  nuevoComentario = '';

  publicar(): void {
    const comentario = this.nuevoComentario.trim();
    if (
      !this.usuarioActual() ||
      !comentario ||
      comentario.length > 300 ||
      !Number.isInteger(this.nuevoPuntaje) ||
      this.nuevoPuntaje < 1 ||
      this.nuevoPuntaje > 5
    )
      return;
    this.resenaPublicada.emit({ puntaje: this.nuevoPuntaje, comentario });
    this.nuevoPuntaje = 5;
    this.nuevoComentario = '';
  }
}
