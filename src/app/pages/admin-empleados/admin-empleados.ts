import { mensajeServidor } from '../../utils/errores';
import { Component, inject, OnInit, signal } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { CampoFormulario, DatosFormulario } from '../../models/campo-formulario';
import { Usuario } from '../../models/usuario';
import { Usuarios } from '../../services/usuarios';
import { Administracion } from '../../services/administracion';
import { patronNombrePersona } from '../../utils/validadores-cuenta';

@Component({
  selector: 'app-admin-empleados',
  imports: [SharedModule],
  templateUrl: './admin-empleados.html',
})
export class AdminEmpleados implements OnInit {
  private usuarios = inject(Usuarios);
  private admin = inject(Administracion);
  empleados = signal<Usuario[]>([]);
  cargando = signal(true);
  procesando = signal(false);
  editandoId?: number;
  valores: DatosFormulario = { rol: 'empleado' };
  mensaje = signal('');
  error = signal(false);
  esCuentaPropia(usuario: Usuario): boolean {
    return usuario.id === this.usuarios.getUsuarioActual()?.id;
  }
  campos: CampoFormulario[] = [
    {
      nombre: 'rol',
      etiqueta: 'Rol',
      tipo: 'select',
      requerido: true,
      opciones: [
        { valor: 'empleado', etiqueta: 'Empleado: valida Cine y Candy' },
        { valor: 'admin', etiqueta: 'Administrador: gestiona el cine y valida QR' },
      ],
    },
    {
      nombre: 'nombre',
      etiqueta: 'Nombre',
      tipo: 'text',
      requerido: true,
      minimo: 2,
      maximo: 80,
      patron: patronNombrePersona,
      mensajePatron:
        'El nombre debe contener letras; puede incluir espacios, guiones y apóstrofes.',
    },
    {
      nombre: 'apellido',
      etiqueta: 'Apellido',
      tipo: 'text',
      requerido: true,
      minimo: 2,
      maximo: 80,
      patron: patronNombrePersona,
      mensajePatron:
        'El apellido debe contener letras; puede incluir espacios, guiones y apóstrofes.',
    },
    { nombre: 'email', etiqueta: 'Email', tipo: 'email', requerido: true },
    {
      nombre: 'contrasena',
      etiqueta: 'Contraseña',
      tipo: 'password',
      requerido: true,
      minimo: 6,
      ayuda: 'Mínimo 6 caracteres. Al editar, dejala vacía para conservar la actual.',
    },
  ];

  async ngOnInit(): Promise<void> {
    try {
      await this.cargarEmpleados();
    } catch (error) {
      this.error.set(true);
      this.mensaje.set(mensajeServidor(error, 'No se pudieron cargar las cuentas.'));
    } finally {
      this.cargando.set(false);
    }
  }

  private async cargarEmpleados(): Promise<void> {
    this.empleados.set(
      (await this.usuarios.getUsuarios()).filter(
        (usuario) => usuario.rol === 'empleado' || usuario.rol === 'admin',
      ),
    );
  }

  editar(usuario: Usuario): void {
    if (this.procesando()) return;
    this.editandoId = usuario.id;
    this.actualizarCampoContrasena();
    this.valores = {
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      email: usuario.email,
      contrasena: '',
      rol: usuario.rol ?? 'empleado',
    };
  }

  cancelar(): void {
    this.editandoId = undefined;
    this.actualizarCampoContrasena();
    this.valores = { rol: 'empleado' };
  }

  private actualizarCampoContrasena(): void {
    this.campos = this.campos.map((campo) =>
      campo.nombre === 'contrasena'
        ? { ...campo, requerido: this.editandoId === undefined }
        : campo,
    );
  }

  async guardar(datos: DatosFormulario): Promise<void> {
    if (this.procesando()) return;
    const rol = datos['rol'];
    if (rol !== 'admin' && rol !== 'empleado') {
      this.error.set(true);
      this.mensaje.set('Elegí un rol válido.');
      return;
    }
    if (this.editandoId === this.usuarios.getUsuarioActual()?.id && rol !== 'admin') {
      this.error.set(true);
      this.mensaje.set('No podés quitarte tu propio rol de administrador.');
      return;
    }
    this.procesando.set(true);
    try {
      const error = await this.admin.guardarEmpleado(
        {
          nombre: String(datos['nombre'] ?? '').trim(),
          apellido: String(datos['apellido'] ?? '').trim(),
          email: String(datos['email'] ?? '').trim(),
          contrasena: String(datos['contrasena'] ?? ''),
          rol,
        },
        this.editandoId,
      );
      this.error.set(!!error);
      this.mensaje.set(error || 'Cuenta guardada.');
      if (!error) {
        this.cancelar();
        await this.cargarEmpleados();
      }
    } catch {
      this.error.set(true);
      this.mensaje.set(
        'La operación terminó, pero no se pudo actualizar la lista. Recargá para comprobarla.',
      );
    } finally {
      this.procesando.set(false);
    }
  }

  async eliminar(usuario: Usuario): Promise<void> {
    if (
      this.procesando() ||
      this.esCuentaPropia(usuario) ||
      !confirm(`¿Eliminar la cuenta de ${usuario.nombre}?`)
    )
      return;
    this.procesando.set(true);
    try {
      const error = await this.admin.eliminarEmpleado(usuario.id);
      this.error.set(!!error);
      this.mensaje.set(error || 'Cuenta eliminada.');
      if (!error) {
        if (this.editandoId === usuario.id) this.cancelar();
        await this.cargarEmpleados();
      }
    } catch {
      this.error.set(true);
      this.mensaje.set('No se pudo actualizar la lista. Recargá para comprobar la eliminación.');
    } finally {
      this.procesando.set(false);
    }
  }
}
