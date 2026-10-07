import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MapaButacas } from '../components/mapa-butacas/mapa-butacas';
import { CalificacionEstrellas } from '../components/calificacion-estrellas/calificacion-estrellas';
import { FormularioCatalogo } from '../components/formulario-catalogo/formulario-catalogo';

// Agrupa las dependencias y componentes que comparten las páginas de gestión.
@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    MapaButacas,
    CalificacionEstrellas,
    FormularioCatalogo,
  ],
  exports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    MapaButacas,
    CalificacionEstrellas,
    FormularioCatalogo,
  ],
})
export class SharedModule {}
