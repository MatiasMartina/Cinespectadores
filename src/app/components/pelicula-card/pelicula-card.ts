import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Pelicula } from '../../models/pelicula';

@Component({
  selector: 'app-pelicula-card',
  imports: [RouterLink],
  templateUrl: './pelicula-card.html',
  styleUrl: './pelicula-card.css',
})
export class PeliculaCard {
  pelicula = input.required<Pelicula>();
  vistaPrevia = input(false);
}
