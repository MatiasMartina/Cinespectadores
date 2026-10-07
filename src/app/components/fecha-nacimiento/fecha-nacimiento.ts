import { Component, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { formatearNacimiento } from '../../utils/fechas';

@Component({
  selector: 'app-fecha-nacimiento',
  templateUrl: './fecha-nacimiento.html',
  styleUrl: './fecha-nacimiento.css',
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => FechaNacimiento), multi: true },
  ],
})
export class FechaNacimiento implements ControlValueAccessor {
  identificador = input.required<string>();
  invalida = input(false);
  valor = signal('');
  deshabilitado = signal(false);
  private actualizar: (valor: string) => void = () => {};
  private tocar: () => void = () => {};

  // Angular entrega el valor del FormControl o de ngModel a este componente.
  writeValue(valor: string | null): void {
    this.valor.set(valor ?? '');
  }
  registerOnChange(actualizar: (valor: string) => void): void {
    this.actualizar = actualizar;
  }
  registerOnTouched(tocar: () => void): void {
    this.tocar = tocar;
  }
  setDisabledState(deshabilitado: boolean): void {
    this.deshabilitado.set(deshabilitado);
  }

  escribir(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const fecha = formatearNacimiento(input.value);
    input.value = fecha;
    this.valor.set(fecha);
    this.actualizar(fecha);
  }
  perderFoco(): void {
    this.tocar();
  }
}
