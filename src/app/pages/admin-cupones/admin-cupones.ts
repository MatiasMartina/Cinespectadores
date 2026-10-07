import { mensajeServidor } from '../../utils/errores';
import { Component, inject, OnInit, signal } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { CampoFormulario, DatosFormulario } from '../../models/campo-formulario';
import { Cupon } from '../../models/cupon';
import { Cupones } from '../../services/cupones';
import { Configuracion } from '../../services/configuracion';
import { Administracion } from '../../services/administracion';

@Component({
  selector: 'app-admin-cupones',
  imports: [SharedModule],
  templateUrl: './admin-cupones.html',
})
export class AdminCupones implements OnInit {
  cargando = signal(true);
  procesando = signal(false);
  private cuponesService = inject(Cupones);
  private configuracion = inject(Configuracion);
  private admin = inject(Administracion);
  get cupones() {
    return this.cuponesService.getCupones();
  }
  porcentajePrimeraCompra = 0;
  extraVip = 0;
  editandoId?: number;
  valores: DatosFormulario = { activo: true, edadMinima: 51 };
  mensaje = signal('');
  error = signal(false);
  async ngOnInit(): Promise<void> {
    try {
      await Promise.all([this.cuponesService.cargar(), this.configuracion.cargar()]);
      this.porcentajePrimeraCompra = this.configuracion.getConfiguracion().porcentajePrimeraCompra;
      this.extraVip = this.configuracion.getConfiguracion().extraVip;
    } catch (error) {
      this.error.set(true);
      this.mensaje.set(mensajeServidor(error, 'No se pudieron cargar los datos.'));
    } finally {
      this.cargando.set(false);
    }
  }
  campos: CampoFormulario[] = [
    { nombre: 'codigo', etiqueta: 'Código', tipo: 'text', requerido: true, maximo: 40 },
    { nombre: 'descripcion', etiqueta: 'Descripción', tipo: 'text', requerido: true, maximo: 150 },
    {
      nombre: 'porcentajeDescuento',
      etiqueta: 'Descuento (%)',
      tipo: 'number',
      requerido: true,
      minimo: 1,
      maximo: 100,
    },
    {
      nombre: 'edadMinima',
      etiqueta: 'Edad mínima (opcional)',
      tipo: 'number',
      entero: true,
      minimo: 0,
      maximo: 130,
      ayuda: '51 para usuarios mayores de 50. Vacío para un cupón general.',
    },
    { nombre: 'activo', etiqueta: 'Cupón activo', tipo: 'checkbox' },
  ];
  editar(cupon: Cupon): void {
    this.editandoId = cupon.id;
    this.valores = { ...cupon, edadMinima: cupon.edadMinima ?? null };
  }
  cancelar(): void {
    this.editandoId = undefined;
    this.valores = { activo: true, edadMinima: 51 };
  }
  async guardar(datos: DatosFormulario): Promise<void> {
    if (this.procesando()) return;
    this.procesando.set(true);
    try {
      const edad = datos['edadMinima'];
      const error = await this.admin.guardarCupon(
        {
          codigo: String(datos['codigo']).trim().toUpperCase(),
          descripcion: String(datos['descripcion']).trim(),
          porcentajeDescuento: Number(datos['porcentajeDescuento']),
          edadMinima: edad === null || edad === '' ? undefined : Number(edad),
          activo: datos['activo'] === true,
        },
        this.editandoId,
      );
      this.mostrar(error, 'Cupón guardado.');
      if (!error) this.cancelar();
    } catch (error) {
      this.error.set(true);
      this.mensaje.set(mensajeServidor(error, 'No se pudo guardar el cambio.'));
    } finally {
      this.procesando.set(false);
    }
  }
  async eliminar(cupon: Cupon): Promise<void> {
    if (this.procesando()) return;
    this.procesando.set(true);
    try {
      if (!confirm(`¿Eliminar el cupón ${cupon.codigo}?`)) return;
      this.mostrar(await this.admin.eliminarCupon(cupon.id), 'Cupón eliminado.');
    } catch (error) {
      this.error.set(true);
      this.mensaje.set(mensajeServidor(error, 'No se pudo guardar el cambio.'));
    } finally {
      this.procesando.set(false);
    }
  }
  async guardarConfiguracion(): Promise<void> {
    if (this.procesando()) return;
    this.procesando.set(true);
    try {
      this.mostrar(
        await this.admin.guardarConfiguracion(this.porcentajePrimeraCompra, this.extraVip),
        'Configuración guardada.',
      );
    } catch (error) {
      this.error.set(true);
      this.mensaje.set(mensajeServidor(error, 'No se pudo guardar el cambio.'));
    } finally {
      this.procesando.set(false);
    }
  }
  private mostrar(error: string, exito: string): void {
    this.error.set(!!error);
    this.mensaje.set(error || exito);
  }
}
