import { Component, input, output } from '@angular/core';
import { Butaca } from '../../models/butaca';
import { FilaButacas } from '../../models/fila-butacas';

@Component({
  selector: 'app-mapa-butacas',
  imports: [],
  templateUrl: './mapa-butacas.html',
  styleUrl: './mapa-butacas.css',
})
export class MapaButacas {
  filas = input<FilaButacas[]>([]);
  butacasOcupadas = input<string[]>([]);
  butacasSeleccionadas = input<string[]>([]);
  compacto = input(false);
  soloLectura = input(false);
  permitirDeshabilitadas = input(false);

  butacaElegida = output<Butaca>();

  estaOcupada(butaca: Butaca): boolean {
    return this.butacasOcupadas().includes(butaca.id);
  }

  estaSeleccionada(butaca: Butaca): boolean {
    return this.butacasSeleccionadas().includes(butaca.id);
  }

  elegirButaca(butaca: Butaca): void {
    if (this.soloLectura()) return;
    this.butacaElegida.emit(butaca);
  }

  bloques = [0, 1, 2];

  getButacasDelBloque(fila: FilaButacas, bloque: number): Butaca[] {
    const primerCorte = fila.nombre === 'AC' ? 2 : 4;
    const segundoCorte = fila.nombre === 'AC' ? 12 : 24;

    if (bloque === 0) {
      return fila.butacas.slice(0, primerCorte);
    }

    if (bloque === 1) {
      return fila.butacas.slice(primerCorte, segundoCorte);
    }

    return fila.butacas.slice(segundoCorte);
  }
}
