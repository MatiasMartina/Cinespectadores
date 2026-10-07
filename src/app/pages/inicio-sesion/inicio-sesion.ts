import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Usuarios } from '../../services/usuarios';
import { rutaDeRetorno } from '../../utils/rutas';
import { validarEmailCompleto } from '../../utils/validadores-cuenta';

@Component({
  selector: 'app-inicio-sesion',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './inicio-sesion.html',
  styleUrl: './inicio-sesion.css',
})
export class InicioSesion implements OnInit {
  private usuariosService = inject(Usuarios);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  formInicioSesion = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, validarEmailCompleto],
    }),

    contrasena: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(6)],
    }),
  });

  mensajeError = '';
  formularioEnviado = false;
  procesando = signal(false);
  cargandoSesion = signal(true);

  get returnUrl(): string {
    return rutaDeRetorno(this.route.snapshot.queryParamMap.get('returnUrl'));
  }

  async ngOnInit(): Promise<void> {
    try {
      await this.usuariosService.esperarSesion();
      if (this.usuariosService.getUsuarioActual()) {
        await this.router.navigateByUrl(this.returnUrl);
      }
    } finally {
      this.cargandoSesion.set(false);
    }
  }

  get email() {
    return this.formInicioSesion.controls.email;
  }

  get contrasena() {
    return this.formInicioSesion.controls.contrasena;
  }

  async iniciarSesion(): Promise<void> {
    if (this.procesando() || this.cargandoSesion()) return;
    this.formularioEnviado = true;
    this.mensajeError = '';

    if (this.formInicioSesion.invalid) {
      this.formInicioSesion.markAllAsTouched();
      return;
    }

    const datos = this.formInicioSesion.getRawValue();

    this.procesando.set(true);
    try {
      const resultado = await this.usuariosService.iniciarSesion(datos.email, datos.contrasena);
      if (!resultado.valido) {
        this.mensajeError = resultado.mensaje;
        return;
      }
      this.contrasena.setValue('');
      await this.router.navigateByUrl(this.returnUrl);
    } catch {
      this.mensajeError = 'No se pudo iniciar sesión. Revisá la conexión e intentá nuevamente.';
    } finally {
      this.procesando.set(false);
    }
  }
}
