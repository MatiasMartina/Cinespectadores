import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-admin',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './admin.html',
})
export class Admin {
  secciones = [
    { ruta: 'peliculas', nombre: 'Películas' },
    { ruta: 'funciones', nombre: 'Funciones' },
    { ruta: 'salas', nombre: 'Salas y butacas' },
    { ruta: 'productos', nombre: 'Candy Bar' },
    { ruta: 'cupones', nombre: 'Cupones y precios' },
    { ruta: 'beneficios', nombre: 'Combos y puntos' },
    { ruta: 'reportes', nombre: 'Reportes' },
    { ruta: 'actividad', nombre: 'Actividad' },
    { ruta: 'empleados', nombre: 'Empleados y admins' },
  ];
}
