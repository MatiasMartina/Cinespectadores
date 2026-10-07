import { mensajeServidor } from '../utils/errores';
import { inject, Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { User } from '@supabase/supabase-js';
import { DatosEmpleado, Usuario } from '../models/usuario';
import { ResultadoAutenticacion } from '../models/resultado-autenticacion';
import { nacimientoIso } from '../utils/fechas';
import { Configuracion } from './configuracion';
import { Supabase } from './supabase';

interface Perfil {
  id: number;
  auth_id: string;
  nombre: string;
  apellido: string;
  email: string;
  fecha_nacimiento: string;
  rol: 'cliente' | 'admin' | 'empleado';
  primera_compra_realizada: boolean;
  puntos?: number;
  credito?: number;
}

@Injectable({ providedIn: 'root' })
export class Usuarios implements OnDestroy {
  private supabase = inject(Supabase);
  private configuracion = inject(Configuracion);
  private usuarioActualSubject = new BehaviorSubject<Usuario | undefined>(undefined);
  readonly usuarioActual$ = this.usuarioActualSubject.asObservable();
  private revisionSesion = 0;
  private cargaSesion: Promise<void> = Promise.resolve();
  private resolverInicio!: () => void;
  private sesionInicial = new Promise<void>((resolve) => (this.resolverInicio = resolve));
  private dejarDeEscuchar: () => void;

  constructor() {
    const { data } = this.supabase.cliente.auth.onAuthStateChange((evento, sesion) => {
      if (evento === 'TOKEN_REFRESHED') return;
      const revision = ++this.revisionSesion;
      if (!sesion) {
        this.usuarioActualSubject.next(undefined);
        this.cargaSesion = Promise.resolve();
        this.resolverInicio();
        return;
      }
      if (this.getUsuarioActual()?.authId !== sesion.user.id) {
        this.usuarioActualSubject.next(undefined);
      }
      // El callback de Auth termina antes de consultar el perfil con el mismo cliente.
      this.cargaSesion = new Promise<void>((resolve) => {
        setTimeout(() => {
          void this.cargarSesion(sesion.user, revision)
            .catch((error) => {
              if (revision === this.revisionSesion) this.usuarioActualSubject.next(undefined);
              console.error('No se pudo cargar el perfil de la sesión:', error);
            })
            .finally(() => {
              resolve();
              this.resolverInicio();
            });
        }, 0);
      });
    });
    this.dejarDeEscuchar = () => data.subscription.unsubscribe();
  }

  async esperarSesion(): Promise<void> {
    await this.sesionInicial;
    let pendiente: Promise<void>;
    do {
      pendiente = this.cargaSesion;
      await pendiente;
    } while (pendiente !== this.cargaSesion);
  }

  getUsuarioActual(): Usuario | undefined {
    return this.usuarioActualSubject.value;
  }

  async registrar(
    nombre: string,
    apellido: string,
    email: string,
    fechaNacimiento: string,
    contrasena: string,
    destino = '/',
  ): Promise<ResultadoAutenticacion> {
    await this.esperarSesion();
    nombre = nombre.trim();
    apellido = apellido.trim();
    const nombreValido = (valor: string) =>
      valor.length >= 2 &&
      valor.length <= 80 &&
      /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü' -]+$/.test(valor) &&
      /[A-Za-zÁÉÍÓÚáéíóúÑñÜü]/.test(valor);
    if (!nombreValido(nombre)) {
      return {
        valido: false,
        mensaje: 'El nombre debe tener entre 2 y 80 caracteres y contener letras.',
      };
    }
    if (!nombreValido(apellido))
      return {
        valido: false,
        mensaje: 'El apellido debe tener entre 2 y 80 caracteres y contener letras.',
      };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      return { valido: false, mensaje: 'Ingresá un email válido, por ejemplo nombre@dominio.com.' };
    if (contrasena.length < 6)
      return { valido: false, mensaje: 'La contraseña debe tener al menos 6 caracteres.' };
    const nacimiento = nacimientoIso(fechaNacimiento);
    if (!nacimiento) return { valido: false, mensaje: 'Ingresá una fecha de nacimiento válida.' };
    try {
      const { data, error } = await this.supabase.cliente.auth.signUp({
        email: email.trim().toLowerCase(),
        password: contrasena,
        options: {
          data: { nombre: nombre.trim(), apellido: apellido.trim(), fechaNacimiento: nacimiento },
          emailRedirectTo: `${window.location.origin}/inicio-sesion?returnUrl=${encodeURIComponent(destino)}`,
        },
      });
      if (error) return { valido: false, mensaje: this.mensajeAutenticacion(error.code) };
      if (!data.session) {
        return {
          valido: true,
          requiereConfirmacion: true,
          mensaje: 'Revisá tu correo y confirmá la cuenta antes de iniciar sesión.',
        };
      }
      await this.completarIngreso(data.session.user);
      return { valido: true, mensaje: 'Tu cuenta fue creada y ya iniciaste sesión.' };
    } catch {
      return {
        valido: false,
        mensaje: 'No se pudo completar el registro. Intentá iniciar sesión para continuar.',
      };
    }
  }

  async iniciarSesion(email: string, contrasena: string): Promise<ResultadoAutenticacion> {
    await this.esperarSesion();
    try {
      const { data, error } = await this.supabase.cliente.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: contrasena,
      });
      if (error) return { valido: false, mensaje: this.mensajeAutenticacion(error.code) };
      await this.completarIngreso(data.user);
      return { valido: true, mensaje: 'Sesión iniciada.' };
    } catch {
      return {
        valido: false,
        mensaje: 'No se pudo cargar tu cuenta. Revisá la conexión e intentá nuevamente.',
      };
    }
  }

  async cerrarSesion(): Promise<boolean> {
    try {
      const { error } = await this.supabase.cliente.auth.signOut({ scope: 'local' });
      if (error) return false;
      ++this.revisionSesion;
      this.usuarioActualSubject.next(undefined);
      return true;
    } catch {
      return false;
    }
  }

  private async completarIngreso(user: User): Promise<void> {
    const carga = this.cargarSesion(user, ++this.revisionSesion);
    this.cargaSesion = carga.catch(() => undefined);
    await carga;
  }

  private async cargarSesion(user: User, revision: number): Promise<void> {
    if (revision !== this.revisionSesion) return;
    const usuario = await this.obtenerOCrearPerfil(user);
    if (revision === this.revisionSesion) this.usuarioActualSubject.next(usuario);
  }

  private async obtenerOCrearPerfil(user: User): Promise<Usuario> {
    const tabla = this.supabase.cliente.from('perfiles');
    const consulta = await tabla.select('*').eq('auth_id', user.id).maybeSingle();
    if (consulta.error) throw consulta.error;
    if (consulta.data) return this.convertirPerfil(consulta.data as Perfil);
    const { nombre, apellido, fechaNacimiento } = user.user_metadata;
    const nacimiento =
      typeof fechaNacimiento === 'string' ? nacimientoIso(fechaNacimiento) : undefined;
    if (typeof nombre !== 'string' || typeof apellido !== 'string' || !nacimiento || !user.email) {
      throw new Error('La cuenta no tiene un perfil. Registrala desde la aplicación.');
    }
    const creacion = await tabla.upsert(
      {
        auth_id: user.id,
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        email: user.email.trim().toLowerCase(),
        fecha_nacimiento: nacimiento,
        rol: 'cliente',
        primera_compra_realizada: false,
      },
      { onConflict: 'auth_id', ignoreDuplicates: true },
    );
    if (creacion.error) throw creacion.error;
    const perfil = await tabla.select('*').eq('auth_id', user.id).single();
    if (perfil.error) throw perfil.error;
    return this.convertirPerfil(perfil.data as Perfil);
  }

  private convertirPerfil(perfil: Perfil): Usuario {
    return {
      id: perfil.id,
      authId: perfil.auth_id,
      nombre: perfil.nombre,
      apellido: perfil.apellido,
      email: perfil.email,
      fechaNacimiento: perfil.fecha_nacimiento,
      rol: perfil.rol,
      primeraCompraRealizada: perfil.primera_compra_realizada,
      puntos: Number(perfil.puntos ?? 0),
      credito: Number(perfil.credito ?? 0),
    };
  }

  async getUsuarios(): Promise<Usuario[]> {
    const resultado = await this.gestionarEmpleados({ accion: 'listar' });
    return (resultado.perfiles ?? []).map((perfil) => this.convertirPerfil(perfil));
  }

  gestionRolesDisponible = false;

  async guardarEmpleado(datos: DatosEmpleado, id?: number): Promise<boolean> {
    if (datos.rol === 'admin' && !this.gestionRolesDisponible) {
      throw new Error(
        'La gestión de administradores no está disponible en este momento. Contactá al soporte del sistema.',
      );
    }
    await this.gestionarEmpleados({ accion: 'guardar', datos, id });
    return true;
  }

  async eliminarEmpleado(id: number): Promise<boolean> {
    await this.gestionarEmpleados({ accion: 'eliminar', id });
    return true;
  }

  private async gestionarEmpleados(body: object): Promise<{ perfiles?: Perfil[] }> {
    await this.esperarSesion();
    const { data, error } = await this.supabase.cliente.functions.invoke('gestionar-empleados', {
      body,
    });
    if (error) {
      const respuesta =
        error.context instanceof Response
          ? await error.context.json().catch(() => undefined)
          : undefined;
      throw new Error(
        mensajeServidor(
          respuesta?.mensaje,
          'No se pudo completar la operación. Intentá nuevamente más tarde.',
        ),
      );
    }
    if (!data?.valido)
      throw new Error(
        mensajeServidor(data?.mensaje, 'No se pudo administrar las cuentas. Intentá nuevamente.'),
      );
    this.gestionRolesDisponible = data.versionGestionCuentas === 2;
    return data;
  }

  calcularEdad(fechaNacimiento: string): number {
    const iso = nacimientoIso(fechaNacimiento);
    if (!iso) return NaN;
    const hoy = new Date();
    const nacimiento = new Date(`${iso}T00:00:00`);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    if (
      hoy.getMonth() < nacimiento.getMonth() ||
      (hoy.getMonth() === nacimiento.getMonth() && hoy.getDate() < nacimiento.getDate())
    )
      edad--;
    return edad;
  }

  calcularEdadUsuarioActual(): number | undefined {
    const usuario = this.getUsuarioActual();
    return usuario ? this.calcularEdad(usuario.fechaNacimiento) : undefined;
  }

  tieneDescuentoPrimeraCompra(): boolean {
    const usuario = this.getUsuarioActual();
    return usuario !== undefined && usuario.primeraCompraRealizada !== true;
  }

  getPorcentajeDescuentoPrimeraCompra(): number {
    return this.configuracion.getConfiguracion().porcentajePrimeraCompra;
  }

  async actualizarPerfil(): Promise<void> {
    await this.esperarSesion();
    const usuario = this.getUsuarioActual();
    if (!usuario) return;
    const revision = ++this.revisionSesion;
    const { data, error } = await this.supabase.cliente
      .from('perfiles')
      .select('*')
      .eq('auth_id', usuario.authId)
      .single();
    if (error) throw new Error('No se pudo actualizar el saldo de puntos.');
    if (revision === this.revisionSesion && this.getUsuarioActual()?.authId === usuario.authId)
      this.usuarioActualSubject.next(this.convertirPerfil(data as Perfil));
  }
  private mensajeAutenticacion(codigo?: string): string {
    if (codigo === 'email_not_confirmed') return 'Confirmá tu correo antes de iniciar sesión.';
    if (codigo === 'user_already_exists' || codigo === 'email_exists')
      return 'Ese email ya está registrado. Iniciá sesión.';
    if (codigo === 'weak_password')
      return 'La contraseña es demasiado débil. Elegí una más larga y difícil de adivinar.';
    if (codigo === 'over_email_send_rate_limit' || codigo === 'over_request_rate_limit')
      return 'Esperá unos minutos antes de volver a intentarlo.';
    if (codigo === 'invalid_credentials') return 'El email o la contraseña son incorrectos.';
    return 'No se pudo autenticar la cuenta. Revisá los datos y la conexión.';
  }

  ngOnDestroy(): void {
    ++this.revisionSesion;
    this.dejarDeEscuchar();
  }
}
