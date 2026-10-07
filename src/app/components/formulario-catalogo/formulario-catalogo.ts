import { Component, input, output, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { Subscription } from 'rxjs';
import { fechaManualIso, fechaParaMostrar } from '../../utils/fechas';
import { validarFechaManual } from '../../utils/validadores-fecha';
import { validarEmailCompleto } from '../../utils/validadores-cuenta';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  ValidatorFn,
} from '@angular/forms';
import { CampoFormulario, DatosFormulario, ValorFormulario } from '../../models/campo-formulario';

@Component({
  selector: 'app-formulario-catalogo',
  imports: [ReactiveFormsModule],
  templateUrl: './formulario-catalogo.html',
})
export class FormularioCatalogo implements OnChanges, OnDestroy {
  titulo = input('Nuevo registro');
  idFormulario = input('');
  mostrarAcciones = input(true);
  campos = input<CampoFormulario[]>([]);
  valores = input<DatosFormulario>({});
  guardado = output<DatosFormulario>();
  cancelado = output<void>();
  modificado = output<DatosFormulario>();
  private cambiosFormulario?: Subscription;
  formulario = new FormGroup<Record<string, FormControl<ValorFormulario>>>({});

  ngOnChanges(cambios: SimpleChanges): void {
    if (!cambios['campos'] && !cambios['valores']) return;
    // Actualizar opciones de una categoría conserva el producto que se está escribiendo.
    const valores = cambios['valores']
      ? this.valores()
      : { ...this.valores(), ...this.formulario.getRawValue() };
    const controles: Record<string, FormControl<ValorFormulario>> = {};
    for (const campo of this.campos()) {
      const validadores: ValidatorFn[] = [];
      if (campo.requerido) validadores.push(Validators.required);
      if (campo.requerido && campo.tipo !== 'checkbox')
        validadores.push((control) =>
          typeof control.value === 'string' && !control.value.trim() ? { required: true } : null,
        );
      if (campo.tipo === 'email') validadores.push(validarEmailCompleto);
      if (campo.patron) validadores.push(Validators.pattern(campo.patron));
      if (campo.entero)
        validadores.push((control) =>
          control.value === null || control.value === '' || Number.isInteger(control.value)
            ? null
            : { entero: true },
        );
      if (campo.tipo === 'date') validadores.push(validarFechaManual());
      if (campo.tipo === 'generos')
        validadores.push((control) =>
          String(control.value ?? '')
            .split(',')
            .some((g) => g.trim())
            ? null
            : { generos: true },
        );
      if (campo.minimo !== undefined)
        validadores.push(
          campo.tipo === 'number'
            ? Validators.min(campo.minimo)
            : (control) => {
                const valor = String(control.value ?? '');
                const longitud = (campo.tipo === 'password' ? valor : valor.trim()).length;
                return longitud > 0 && longitud < campo.minimo!
                  ? { minlength: { requiredLength: campo.minimo } }
                  : null;
              },
        );
      if (campo.maximo !== undefined)
        validadores.push(
          campo.tipo === 'number'
            ? Validators.max(campo.maximo)
            : Validators.maxLength(campo.maximo),
        );
      const defecto = campo.tipo === 'checkbox' ? false : campo.tipo === 'number' ? null : '';
      controles[campo.nombre] = new FormControl<ValorFormulario>(
        campo.tipo === 'date'
          ? fechaParaMostrar(String(valores[campo.nombre] ?? ''))
          : (valores[campo.nombre] ?? defecto),
        validadores,
      );
    }
    this.cambiosFormulario?.unsubscribe();
    this.formulario = new FormGroup(controles);
    this.cambiosFormulario = this.formulario.valueChanges.subscribe(() =>
      this.modificado.emit(this.datosParaGuardar()),
    );
    this.modificado.emit(this.datosParaGuardar());
  }

  private datosParaGuardar(): DatosFormulario {
    const datos = this.formulario.getRawValue();
    for (const campo of this.campos()) {
      if (campo.tipo === 'date')
        datos[campo.nombre] = fechaManualIso(String(datos[campo.nombre] ?? '')) ?? '';
      else if (typeof datos[campo.nombre] === 'string' && campo.tipo !== 'password')
        datos[campo.nombre] = String(datos[campo.nombre]).trim();
    }
    return datos;
  }

  mensajeCampo(campo: CampoFormulario): string {
    const control = this.formulario.controls[campo.nombre];
    if (!control?.touched || !control.errors) return '';
    if (control.hasError('required'))
      return campo.tipo === 'select'
        ? 'Elegí una opción.'
        : `Completá ${campo.etiqueta.toLocaleLowerCase('es')}.`;
    if (control.hasError('email'))
      return 'Ingresá un email válido, por ejemplo nombre@dominio.com.';
    if (control.hasError('minlength')) return `Ingresá al menos ${campo.minimo} caracteres.`;
    if (control.hasError('maxlength')) return `Ingresá como máximo ${campo.maximo} caracteres.`;
    if (control.hasError('pattern'))
      return campo.mensajePatron ?? 'El formato ingresado no es válido.';
    if (control.hasError('min')) return `Ingresá un valor igual o mayor que ${campo.minimo}.`;
    if (control.hasError('max')) return `Ingresá un valor igual o menor que ${campo.maximo}.`;
    if (control.hasError('entero')) return 'Ingresá un número entero, sin decimales.';
    if (control.hasError('fecha')) return 'Escribí una fecha real con formato dd/mm/aaaa.';
    if (control.hasError('generos')) return 'Elegí o escribí al menos un género.';
    return 'Revisá el valor ingresado.';
  }

  tieneGenero(nombre: string, genero: string): boolean {
    return String(this.formulario.controls[nombre].value ?? '')
      .split(',')
      .some((valor) => valor.trim().toLocaleLowerCase('es') === genero.toLocaleLowerCase('es'));
  }

  elegirGenero(nombre: string, genero: string): void {
    const control = this.formulario.controls[nombre];
    const actuales = String(control.value ?? '')
      .split(',')
      .map((g) => g.trim())
      .filter(Boolean);
    control.setValue(
      (this.tieneGenero(nombre, genero)
        ? actuales.filter((g) => g.toLocaleLowerCase('es') !== genero.toLocaleLowerCase('es'))
        : [...actuales, genero]
      ).join(', '),
    );
    control.markAsTouched();
  }

  ngOnDestroy(): void {
    this.cambiosFormulario?.unsubscribe();
  }

  guardar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    this.guardado.emit(this.datosParaGuardar());
  }
}
