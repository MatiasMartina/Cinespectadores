import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Usuarios } from '../../services/usuarios';
import { FechaNacimiento } from '../../components/fecha-nacimiento/fecha-nacimiento';
import { rutaDeRetorno } from '../../utils/rutas';
import { validarEmailCompleto, validarNombrePersona } from '../../utils/validadores-cuenta';

function fechaNacimientoValida(control: AbstractControl): ValidationErrors | null {
  const valor = control.value;

  if (!valor) {
    return null;
  }

  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(valor)) {
    return { fechaFormatoInvalido: true };
  }

  const [dia, mes, anio] = valor.split('/').map(Number);
  const anioActual = new Date().getFullYear();

  if (anio < 1900 || anio > anioActual) {
    return { anioFueraDeRango: true };
  }

  const fecha = new Date(anio, mes - 1, dia);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const esFechaReal =
    fecha.getFullYear() === anio && fecha.getMonth() === mes - 1 && fecha.getDate() === dia;

  if (!esFechaReal) {
    return { fechaInvalida: true };
  }
  if (fecha > hoy) return { fechaFutura: true };

  return null;
}

function contrasenasCoinciden(control: AbstractControl): ValidationErrors | null {
  const contrasena = control.get('contrasena')?.value;
  const confirmarContrasena = control.get('confirmarContrasena')?.value;

  if (!contrasena || !confirmarContrasena) {
    return null;
  }

  return contrasena === confirmarContrasena ? null : { contrasenasNoCoinciden: true };
}

@Component({
  selector: 'app-registro',
  imports: [ReactiveFormsModule, RouterLink, FechaNacimiento],
  templateUrl: './registro.html',
  styleUrl: './registro.css',
})
export class Registro {
  private usuariosService = inject(Usuarios);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  anioActual = new Date().getFullYear();

  formRegistro = new FormGroup(
    {
      nombre: new FormControl('', {
        nonNullable: true,
        validators: [validarNombrePersona],
      }),
      apellido: new FormControl('', {
        nonNullable: true,
        validators: [validarNombrePersona],
      }),
      email: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, validarEmailCompleto],
      }),
      fechaNacimiento: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, fechaNacimientoValida],
      }),
      contrasena: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(6)],
      }),
      confirmarContrasena: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required],
      }),
    },
    { validators: contrasenasCoinciden },
  );

  mensajeError = '';
  mensajeExito = '';
  requiereConfirmacion = false;
  procesando = signal(false);
  registroExitoso = false;
  formularioEnviado = false;
  mostrarContrasena = false;
  mostrarConfirmacion = false;

  get nombre() {
    return this.formRegistro.controls.nombre;
  }

  get apellido() {
    return this.formRegistro.controls.apellido;
  }

  get email() {
    return this.formRegistro.controls.email;
  }

  get fechaNacimiento() {
    return this.formRegistro.controls.fechaNacimiento;
  }

  get contrasena() {
    return this.formRegistro.controls.contrasena;
  }

  get confirmarContrasena() {
    return this.formRegistro.controls.confirmarContrasena;
  }

  mostrarContrasenaPrincipal(): void {
    this.mostrarContrasena = true;
  }

  ocultarContrasenaPrincipal(): void {
    this.mostrarContrasena = false;
  }

  mostrarConfirmacionContrasena(): void {
    this.mostrarConfirmacion = true;
  }

  ocultarConfirmacionContrasena(): void {
    this.mostrarConfirmacion = false;
  }

  mensajeNombre(control: FormControl<string>, campo: string): string {
    if (control.hasError('required')) return `Ingresá tu ${campo}.`;
    if (control.hasError('minlength')) return `El ${campo} debe tener al menos 2 caracteres.`;
    if (control.hasError('maxlength')) return `El ${campo} debe tener como máximo 80 caracteres.`;
    return `El ${campo} debe contener letras; puede incluir espacios, guiones y apóstrofes.`;
  }

  get returnUrl(): string {
    return rutaDeRetorno(this.route.snapshot.queryParamMap.get('returnUrl'));
  }

  async registrar(): Promise<void> {
    if (this.procesando()) return;
    this.formularioEnviado = true;
    this.mensajeError = '';
    this.registroExitoso = false;

    if (this.formRegistro.invalid) {
      this.formRegistro.markAllAsTouched();
      return;
    }

    const datos = this.formRegistro.getRawValue();
    const [dia, mes, anio] = datos.fechaNacimiento.split('/');
    const fechaNacimiento = `${anio}-${mes}-${dia}`;

    this.procesando.set(true);
    try {
      const resultado = await this.usuariosService.registrar(
        datos.nombre,
        datos.apellido,
        datos.email,
        fechaNacimiento,
        datos.contrasena,
        this.returnUrl,
      );
      if (!resultado.valido) {
        this.mensajeError = resultado.mensaje;
        return;
      }
      this.contrasena.setValue('');
      this.confirmarContrasena.setValue('');
      this.requiereConfirmacion = resultado.requiereConfirmacion === true;
      this.mensajeExito = resultado.mensaje;
      if (!this.requiereConfirmacion && this.returnUrl !== '/') {
        await this.router.navigateByUrl(this.returnUrl);
        return;
      }
      this.registroExitoso = true;
    } catch {
      this.mensajeError = 'No se pudo completar el registro. Intentá nuevamente.';
    } finally {
      this.procesando.set(false);
    }
  }
}
