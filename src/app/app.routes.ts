import { Routes } from '@angular/router';
import { adminGuard, empleadoGuard, sesionGuard } from './guards/roles-guard';
import { salidaCompraGuard } from './guards/salida-compra-guard';

export const routes: Routes = [
  {
    path: 'proximamente',
    loadComponent: () => import('./pages/proximamente/proximamente').then((m) => m.Proximamente),
  },
  {
    path: 'mis-peliculas',
    canActivate: [sesionGuard],
    loadComponent: () => import('./pages/mis-peliculas/mis-peliculas').then((m) => m.MisPeliculas),
  },
  {
    path: 'notificaciones',
    canActivate: [sesionGuard],
    loadComponent: () =>
      import('./pages/notificaciones/notificaciones').then((m) => m.Notificaciones),
  },
  {
    path: '',
    loadComponent: () => import('./pages/inicio/inicio').then((m) => m.Inicio),
  },
  {
    path: 'pelicula/:id',
    canDeactivate: [salidaCompraGuard],
    loadComponent: () =>
      import('./pages/detalle-pelicula/detalle-pelicula').then((m) => m.DetallePelicula),
  },
  {
    path: 'funcion/:id/butacas',
    canDeactivate: [salidaCompraGuard],
    loadComponent: () =>
      import('./pages/seleccion-butacas/seleccion-butacas').then((m) => m.SeleccionButacas),
  },
  {
    path: 'confirmacion',
    canDeactivate: [salidaCompraGuard],
    loadComponent: () =>
      import('./pages/confirmacion-compra/confirmacion-compra').then((m) => m.ConfirmacionCompra),
  },
  {
    path: 'registro',
    canDeactivate: [salidaCompraGuard],
    loadComponent: () => import('./pages/registro/registro').then((m) => m.Registro),
  },
  {
    path: 'inicio-sesion',
    canDeactivate: [salidaCompraGuard],
    loadComponent: () => import('./pages/inicio-sesion/inicio-sesion').then((m) => m.InicioSesion),
  },
  {
    path: 'candy-bar',
    canDeactivate: [salidaCompraGuard],
    loadComponent: () => import('./pages/candy-bar/candy-bar').then((m) => m.CandyBarPage),
  },
  {
    path: 'pago',
    canDeactivate: [salidaCompraGuard],
    loadComponent: () => import('./pages/pago/pago').then((m) => m.Pago),
  },
  {
    path: 'perfil',
    canActivate: [sesionGuard],
    loadComponent: () => import('./pages/perfil/perfil').then((m) => m.Perfil),
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    canActivateChild: [adminGuard],
    loadComponent: () => import('./pages/admin/admin').then((m) => m.Admin),
    loadChildren: () => import('./pages/admin/admin.routes').then((m) => m.adminRoutes),
  },
  {
    path: 'empleados',
    canActivate: [empleadoGuard],
    loadComponent: () => import('./pages/empleados/empleados').then((m) => m.Empleados),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
