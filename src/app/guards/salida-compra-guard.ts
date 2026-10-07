import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { PaginaCompra, SalidaCompra } from '../services/salida-compra';

export const salidaCompraGuard: CanDeactivateFn<PaginaCompra> = (
  componente,
  _ruta,
  actual,
  siguiente,
) => inject(SalidaCompra).permitirSalida(siguiente.url, componente, actual.url);
