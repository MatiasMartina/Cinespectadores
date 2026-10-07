import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Pwa } from './services/pwa';
import { Navbar } from './components/navbar/navbar';
import { SalidaCompra } from './services/salida-compra';

@Component({
  selector: 'app-root',
  imports: [Navbar, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
  host: {
    '(window:beforeunload)': 'salidaCompra.avisarAntesDeSalir($event)',
    '(window:pagehide)': 'salidaCompra.descartarAlSalirDelDocumento()',
    '(window:pageshow)': 'salidaCompra.revisarRestauracion($event)',
  },
})
export class App {
  pwa = inject(Pwa);
  salidaCompra = inject(SalidaCompra);
}
