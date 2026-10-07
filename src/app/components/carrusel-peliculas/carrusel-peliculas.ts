import {
  Component,
  computed,
  ElementRef,
  inject,
  input,
  OnChanges,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Pelicula } from '../../models/pelicula';

@Component({
  selector: 'app-carrusel-peliculas',
  imports: [RouterLink],
  templateUrl: './carrusel-peliculas.html',
  styleUrl: './carrusel-peliculas.css',
  host: { '(document:visibilitychange)': 'actualizarRotacion()' },
})
export class CarruselPeliculas implements OnInit, OnChanges, OnDestroy {
  peliculas = input<Pelicula[]>([]);
  indiceActual = signal(0);
  peliculaActiva = computed(() => this.peliculas()[this.indiceActual()]);
  private elemento = inject(ElementRef<HTMLElement>);
  private movimientoReducido = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  pausado = signal(this.movimientoReducido?.matches ?? false);
  private intervalo?: number;
  private conMouse = false;
  private conFoco = false;
  private destruido = false;
  private alCambiarMovimiento = (evento: MediaQueryListEvent): void => {
    if (evento.matches) this.pausado.set(true);
    this.actualizarRotacion();
  };

  ngOnInit(): void {
    this.movimientoReducido?.addEventListener('change', this.alCambiarMovimiento);
    this.actualizarRotacion();
  }

  ngOnChanges(): void {
    this.indiceActual.set(0);
    this.actualizarRotacion();
  }

  siguiente(): void {
    const cantidad = this.peliculas().length;
    if (cantidad) this.seleccionar((this.indiceActual() + 1) % cantidad);
  }

  anterior(): void {
    const cantidad = this.peliculas().length;
    if (cantidad) this.seleccionar((this.indiceActual() - 1 + cantidad) % cantidad);
  }

  seleccionar(indice: number): void {
    if (!Number.isInteger(indice) || indice < 0 || indice >= this.peliculas().length) return;
    this.indiceActual.set(indice);
    this.actualizarRotacion();
  }

  alternarPausa(): void {
    this.pausado.update((pausa) => !pausa);
    if (!this.pausado()) {
      this.conMouse = false;
      this.conFoco = false;
    }
    this.actualizarRotacion();
  }

  cambiarHover(dentro: boolean): void {
    this.conMouse = dentro;
    this.actualizarRotacion();
  }

  entrarFoco(): void {
    this.conFoco = true;
    this.actualizarRotacion();
  }

  salirFoco(evento: FocusEvent): void {
    if (
      evento.relatedTarget instanceof Node &&
      this.elemento.nativeElement.contains(evento.relatedTarget)
    )
      return;
    this.conFoco = false;
    this.actualizarRotacion();
  }

  private actualizarRotacion(): void {
    window.clearInterval(this.intervalo);
    this.intervalo = undefined;
    if (
      this.destruido ||
      this.peliculas().length < 2 ||
      this.pausado() ||
      this.conMouse ||
      this.conFoco ||
      document.hidden
    )
      return;
    this.intervalo = window.setInterval(() => {
      this.indiceActual.update((indice) => (indice + 1) % this.peliculas().length);
    }, 5000);
  }

  ngOnDestroy(): void {
    this.destruido = true;
    window.clearInterval(this.intervalo);
    this.movimientoReducido?.removeEventListener('change', this.alCambiarMovimiento);
  }
}
