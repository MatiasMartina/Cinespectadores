import { Injectable } from '@angular/core';
@Injectable({ providedIn: 'root' })
export class Almacenamiento {
  // Evita dos envíos desde pestañas del mismo navegador. La transacción real está en Supabase.
  exclusivoAsync<T>(accion: () => Promise<T>): Promise<T> {
    if (typeof navigator !== 'undefined' && navigator.locks)
      return navigator.locks.request('cineplus-operaciones', accion);
    return Promise.resolve().then(accion);
  }
}
