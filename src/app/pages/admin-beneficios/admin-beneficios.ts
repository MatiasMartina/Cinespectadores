import { mensajeServidor } from '../../utils/errores';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { SharedModule } from '../../shared/shared.module';
import { Beneficios } from '../../services/beneficios';
import { CandyBar } from '../../services/candy-bar';
import { Combo, Recompensa } from '../../models/beneficios';
@Component({
  selector: 'app-admin-beneficios',
  imports: [SharedModule],
  templateUrl: './admin-beneficios.html',
})
export class AdminBeneficios implements OnInit {
  private beneficios = inject(Beneficios);
  private candy = inject(CandyBar);
  combos = this.beneficios.combos;
  recompensas = this.beneficios.recompensas;
  get productos() {
    return this.candy.getProductos();
  }
  cargando = signal(true);
  procesando = signal(false);
  mensaje = signal('');
  error = signal(false);
  seccion = signal<'combos' | 'recompensas'>('combos');
  comboId?: number;
  recompensaId?: number;
  formCombo = new FormGroup({
    nombre: new FormControl('', { nonNullable: true, validators: Validators.required }),
    precio: new FormControl(12000, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1)],
    }),
    pochoclosId: new FormControl<number | null>(null, Validators.required),
    bebidaId: new FormControl<number | null>(null, Validators.required),
    activo: new FormControl(true, { nonNullable: true }),
  });
  formRecompensa = new FormGroup({
    nombre: new FormControl('', { nonNullable: true, validators: Validators.required }),
    tipo: new FormControl<'entrada' | 'producto'>('entrada', { nonNullable: true }),
    productoId: new FormControl<number | null>(null),
    puntos: new FormControl(500, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1)],
    }),
    activa: new FormControl(true, { nonNullable: true }),
  });
  async ngOnInit(): Promise<void> {
    try {
      await Promise.all([this.beneficios.cargar(), this.candy.cargar()]);
      this.cargando.set(false);
    } catch (error) {
      this.error.set(true);
      this.mensaje.set(mensajeServidor(error, 'No se pudieron cargar los beneficios.'));
    } finally {
      this.cargando.set(false);
    }
  }
  editarCombo(combo: Combo): void {
    this.comboId = combo.id;
    this.formCombo.setValue({
      nombre: combo.nombre,
      precio: combo.precio,
      pochoclosId: combo.pochoclosId,
      bebidaId: combo.bebidaId,
      activo: combo.activo,
    });
  }
  editarRecompensa(r: Recompensa): void {
    this.recompensaId = r.id;
    this.formRecompensa.setValue({
      nombre: r.nombre,
      tipo: r.tipo,
      productoId: r.productoId ?? null,
      puntos: r.puntos,
      activa: r.activa,
    });
  }
  cancelarCombo(): void {
    this.comboId = undefined;
    this.formCombo.reset({
      nombre: '',
      precio: 12000,
      pochoclosId: null,
      bebidaId: null,
      activo: true,
    });
  }
  cancelarRecompensa(): void {
    this.recompensaId = undefined;
    this.formRecompensa.reset({
      nombre: '',
      tipo: 'entrada',
      productoId: null,
      puntos: 500,
      activa: true,
    });
  }
  async guardarCombo(): Promise<void> {
    if (this.procesando()) return;
    const datos = this.formCombo.getRawValue();
    const problema = !datos.nombre.trim()
      ? 'Ingresá el nombre del combo.'
      : !Number.isInteger(datos.precio) || datos.precio < 1
        ? 'El precio del combo debe ser un número entero mayor que cero.'
        : !datos.pochoclosId
          ? 'Elegí los pochoclos del combo.'
          : !datos.bebidaId
            ? 'Elegí la bebida del combo.'
            : datos.pochoclosId === datos.bebidaId
              ? 'Elegí dos productos distintos para los pochoclos y la bebida.'
              : '';
    if (problema) {
      this.formCombo.markAllAsTouched();
      this.error.set(true);
      this.mensaje.set(problema);
      return;
    }
    this.procesando.set(true);
    this.error.set(false);
    try {
      const d = this.formCombo.getRawValue();
      await this.beneficios.guardarCombo(
        { ...d, pochoclosId: Number(d.pochoclosId), bebidaId: Number(d.bebidaId) },
        this.comboId,
      );
      this.cancelarCombo();
      this.mensaje.set('Combo guardado.');
    } catch (error) {
      this.error.set(true);
      this.mensaje.set(mensajeServidor(error, 'No se pudo guardar el combo.'));
    } finally {
      this.procesando.set(false);
    }
  }
  async guardarRecompensa(): Promise<void> {
    if (this.procesando()) return;
    const datos = this.formRecompensa.getRawValue();
    const problema = !datos.nombre.trim()
      ? 'Ingresá el nombre de la recompensa.'
      : !Number.isInteger(datos.puntos) || datos.puntos < 1
        ? 'El costo de la recompensa debe ser un número entero de puntos mayor que cero.'
        : datos.tipo !== 'entrada' && datos.tipo !== 'producto'
          ? 'Elegí entrada o producto como tipo de recompensa.'
          : datos.tipo === 'producto' && !datos.productoId
            ? 'Elegí el producto que se entregará como recompensa.'
            : '';
    if (problema) {
      this.formRecompensa.markAllAsTouched();
      this.error.set(true);
      this.mensaje.set(problema);
      return;
    }
    this.procesando.set(true);
    this.error.set(false);
    try {
      const d = this.formRecompensa.getRawValue();
      await this.beneficios.guardarRecompensa(
        { ...d, productoId: d.productoId ?? undefined },
        this.recompensaId,
      );
      this.cancelarRecompensa();
      this.mensaje.set('Recompensa guardada.');
    } catch (error) {
      this.error.set(true);
      this.mensaje.set(mensajeServidor(error, 'No se pudo guardar la recompensa.'));
    } finally {
      this.procesando.set(false);
    }
  }
}
