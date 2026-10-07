import { Routes } from '@angular/router';

export const adminRoutes: Routes = [
  {
    path: 'actividad',
    loadComponent: () => import('../admin-actividad/admin-actividad').then((m) => m.AdminActividad),
  },
  {
    path: 'beneficios',
    loadComponent: () =>
      import('../admin-beneficios/admin-beneficios').then((m) => m.AdminBeneficios),
  },
  {
    path: 'reportes',
    loadComponent: () => import('../admin-reportes/admin-reportes').then((m) => m.AdminReportes),
  },
  { path: '', pathMatch: 'full', redirectTo: 'peliculas' },
  {
    path: 'peliculas',
    loadComponent: () => import('../admin-peliculas/admin-peliculas').then((m) => m.AdminPeliculas),
  },
  {
    path: 'funciones',
    loadComponent: () => import('../admin-funciones/admin-funciones').then((m) => m.AdminFunciones),
  },
  {
    path: 'salas',
    loadComponent: () => import('../admin-salas/admin-salas').then((m) => m.AdminSalas),
  },
  {
    path: 'productos',
    loadComponent: () => import('../admin-productos/admin-productos').then((m) => m.AdminProductos),
  },
  {
    path: 'cupones',
    loadComponent: () => import('../admin-cupones/admin-cupones').then((m) => m.AdminCupones),
  },
  {
    path: 'empleados',
    loadComponent: () => import('../admin-empleados/admin-empleados').then((m) => m.AdminEmpleados),
  },
];
