import { ValidatorFn } from '@angular/forms';
import { fechaManualIso } from './fechas';

export function validarFechaManual(minima?: () => string): ValidatorFn {
  return (control) => {
    if (!control.value) return null; // Validators.required decide si es obligatoria.
    const iso = fechaManualIso(String(control.value));
    if (!iso) return { fecha: true };
    return minima && iso < minima() ? { fechaMinima: true } : null;
  };
}

export const validarHoraManual: ValidatorFn = (control) =>
  !control.value || /^([01]\d|2[0-3]):[0-5]\d$/.test(String(control.value)) ? null : { hora: true };
