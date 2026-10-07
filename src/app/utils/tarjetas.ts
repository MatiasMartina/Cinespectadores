import { AbstractControl, ValidationErrors } from '@angular/forms';
import { fechaArgentina } from './estrenos';

export function numeroTarjetaValido(control: AbstractControl): ValidationErrors | null {
  const numero = String(control.value ?? '');
  if (!/^\d{16}$/.test(numero)) return null; // required y pattern validan el formato.
  if (/^(\d)\1{15}$/.test(numero)) return { tarjetaInvalida: true };
  // Control Luhn: alterna el doble de los dígitos desde la derecha.
  let suma = 0;
  let duplicar = false;
  for (let i = numero.length - 1; i >= 0; i--) {
    let digito = Number(numero[i]);
    if (duplicar) {
      digito *= 2;
      if (digito > 9) digito -= 9;
    }
    suma += digito;
    duplicar = !duplicar;
  }
  return suma % 10 === 0 ? null : { tarjetaInvalida: true };
}

export function vencimientoTarjetaValido(control: AbstractControl): ValidationErrors | null {
  const valor = String(control.value ?? '');
  if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(valor)) return null;
  const [mes, anio] = valor.split('/').map(Number);
  const [anioActual, mesActual] = fechaArgentina().split('-').map(Number);
  return 2000 + anio < anioActual || (2000 + anio === anioActual && mes < mesActual)
    ? { tarjetaVencida: true }
    : null;
}

export function nombreTitularValido(control: AbstractControl): ValidationErrors | null {
  const valor = String(control.value ?? '');
  if (!valor) return null;
  return valor.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñÜü]/g, '').length >= 2
    ? null
    : { titularInvalido: true };
}
