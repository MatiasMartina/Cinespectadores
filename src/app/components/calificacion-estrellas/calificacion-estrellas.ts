import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-calificacion-estrellas',
  imports: [],
  templateUrl: './calificacion-estrellas.html',
  styleUrl: './calificacion-estrellas.css',
})
export class CalificacionEstrellas {
  puntaje = input.required<number>();
  editable = input(false);

  puntajeSeleccionado = output<number>();

  estrellas = [1, 2, 3, 4, 5];

  seleccionarPuntaje(puntaje: number): void {
    if (!this.editable()) {
      return;
    }

    this.puntajeSeleccionado.emit(puntaje);
  }

  estaActiva(estrella: number): boolean {
    return estrella <= Math.round(this.puntaje());
  }
}
