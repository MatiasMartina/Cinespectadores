import { FormControl } from '@angular/forms';
import { afterEach, vi } from 'vitest';
import { numeroTarjetaValido, vencimientoTarjetaValido, nombreTitularValido } from './tarjetas';

describe('Validaciones de tarjeta simulada', () => {
  afterEach(() => vi.useRealTimers());
  it('acepta números de prueba con Luhn correcto', () => {
    expect(numeroTarjetaValido(new FormControl('4242424242424242'))).toBeNull();
    expect(numeroTarjetaValido(new FormControl('4111111111111111'))).toBeNull();
  });
  it('rechaza un dígito incorrecto y secuencias repetidas', () => {
    expect(numeroTarjetaValido(new FormControl('4242424242424241'))).toEqual({
      tarjetaInvalida: true,
    });
    expect(numeroTarjetaValido(new FormControl('0000000000000000'))).toEqual({
      tarjetaInvalida: true,
    });
  });
  it('deja el formato y los campos vacíos a required/pattern', () => {
    expect(numeroTarjetaValido(new FormControl(''))).toBeNull();
    expect(numeroTarjetaValido(new FormControl('123'))).toBeNull();
    expect(vencimientoTarjetaValido(new FormControl('13/30'))).toBeNull();
  });
  it('acepta el mes actual hasta su último día y rechaza el anterior', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-31T12:00:00Z'));
    expect(vencimientoTarjetaValido(new FormControl('10/26'))).toBeNull();
    expect(vencimientoTarjetaValido(new FormControl('09/26'))).toEqual({ tarjetaVencida: true });
    expect(vencimientoTarjetaValido(new FormControl('12/25'))).toEqual({ tarjetaVencida: true });
    expect(vencimientoTarjetaValido(new FormControl('01/27'))).toBeNull();
  });
  it('rechaza titulares con solo espacios o signos y acepta nombres con acentos', () => {
    expect(nombreTitularValido(new FormControl('   '))).toEqual({ titularInvalido: true });
    expect(nombreTitularValido(new FormControl("''"))).toEqual({ titularInvalido: true });
    expect(nombreTitularValido(new FormControl('Ana Pérez'))).toBeNull();
  });
});
