import { ValidatorFn, Validators } from '@angular/forms';

export const patronNombrePersona = /^(?=.*[A-Za-zÁÉÍÓÚáéíóúÑñÜü])[A-Za-zÁÉÍÓÚáéíóúÑñÜü' -]+$/;

export const validarNombrePersona: ValidatorFn = (control) => {
  const valor = String(control.value ?? '').trim();
  if (!valor) return { required: true };
  if (valor.length < 2) return { minlength: { requiredLength: 2 } };
  if (valor.length > 80) return { maxlength: { requiredLength: 80 } };
  return patronNombrePersona.test(valor) ? null : { nombrePersona: true };
};

export const validarEmailCompleto: ValidatorFn = (control) => {
  if (!control.value) return null;
  return (
    Validators.email(control) ??
    (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(control.value)) ? null : { email: true })
  );
};
