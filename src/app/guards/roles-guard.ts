import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Usuarios } from '../services/usuarios';

async function permitir(roles: string[], destino: string) {
  const usuarios = inject(Usuarios);
  const router = inject(Router);
  await usuarios.esperarSesion();
  const usuario = usuarios.getUsuarioActual();
  if (!usuario) {
    return router.createUrlTree(['/inicio-sesion'], { queryParams: { returnUrl: destino } });
  }
  return roles.includes(usuario.rol ?? 'cliente') ? true : router.createUrlTree(['/']);
}

export const adminGuard: CanActivateFn = (_ruta, estado) => permitir(['admin'], estado.url);
export const empleadoGuard: CanActivateFn = (_ruta, estado) =>
  permitir(['admin', 'empleado'], estado.url);

export const sesionGuard: CanActivateFn = (_ruta, estado) =>
  permitir(['cliente', 'admin', 'empleado'], estado.url);
