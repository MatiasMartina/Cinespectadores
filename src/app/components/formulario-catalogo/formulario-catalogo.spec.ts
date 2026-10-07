import { Supabase } from '../../services/supabase';
import { crearSupabaseDePrueba, prepararCatalogoDePrueba } from '../../testing/supabase-pruebas';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { FormularioCatalogo } from './formulario-catalogo';
import { patronNombrePersona } from '../../utils/validadores-cuenta';

describe('FormularioCatalogo', () => {
  it('señala el campo incorrecto y evita enviar correos incompletos, espacios, nombres sin letras y decimales', async () => {
    const fixture = TestBed.createComponent(FormularioCatalogo);
    const campos = [
      {
        nombre: 'nombre',
        etiqueta: 'Nombre',
        tipo: 'text' as const,
        requerido: true,
        minimo: 2,
        patron: patronNombrePersona,
        mensajePatron: 'El nombre debe contener letras.',
      },
      { nombre: 'email', etiqueta: 'Email', tipo: 'email' as const, requerido: true },
      {
        nombre: 'precio',
        etiqueta: 'Precio',
        tipo: 'number' as const,
        requerido: true,
        minimo: 1,
        entero: true,
      },
      {
        nombre: 'contrasena',
        etiqueta: 'Contraseña',
        tipo: 'password' as const,
        requerido: true,
        minimo: 6,
      },
    ];
    fixture.componentRef.setInput('campos', campos);
    await fixture.whenStable();
    const componente = fixture.componentInstance;
    const guardar = vi.fn();
    componente.guardado.subscribe(guardar);
    componente.formulario.setValue({
      nombre: '--',
      email: 'Tomi@tomi',
      precio: 1.5,
      contrasena: '123',
    });
    componente.guardar();
    fixture.detectChanges();
    expect(guardar).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('nombre@dominio.com');
    expect(componente.mensajeCampo(campos[0])).toContain('letras');
    expect(componente.mensajeCampo(campos[2])).toContain('sin decimales');
    expect(componente.mensajeCampo(campos[3])).toContain('6 caracteres');
    componente.formulario.controls['nombre'].setValue('   ');
    expect(componente.mensajeCampo(campos[0])).toBe('Completá nombre.');
    componente.formulario.setValue({
      nombre: ' Tomi ',
      email: 'tomi@cine.test',
      precio: 100,
      contrasena: ' clave ',
    });
    componente.guardar();
    expect(guardar).toHaveBeenCalledWith({
      nombre: 'Tomi',
      email: 'tomi@cine.test',
      precio: 100,
      contrasena: ' clave ',
    });
    fixture.componentRef.setInput(
      'campos',
      campos.map((campo) =>
        campo.nombre === 'contrasena' ? { ...campo, requerido: false } : campo,
      ),
    );
    await fixture.whenStable();
    componente.formulario.controls['contrasena'].setValue('');
    componente.guardar();
    expect(guardar).toHaveBeenCalledTimes(2);
  });
  it('muestra ISO como fecha manual, rechaza fechas inexistentes y emite ISO al guardar', async () => {
    const fixture = TestBed.createComponent(FormularioCatalogo);
    fixture.componentRef.setInput('campos', [
      { nombre: 'estreno', etiqueta: 'Estreno', tipo: 'date' },
    ]);
    fixture.componentRef.setInput('valores', { estreno: '2030-01-01' });
    await fixture.whenStable();
    const control = fixture.componentInstance.formulario.controls['estreno'];
    expect(control.value).toBe('01/01/2030');
    const guardar = vi.fn();
    fixture.componentInstance.guardado.subscribe(guardar);
    control.setValue('31/02/2030');
    fixture.componentInstance.guardar();
    expect(guardar).not.toHaveBeenCalled();
    expect(control.value).toBe('31/02/2030');
    control.setValue('29/02/2032');
    fixture.componentInstance.guardar();
    expect(guardar).toHaveBeenCalledWith({ estreno: '2032-02-29' });
  });
  it('combina géneros existentes con uno nuevo y actualiza la vista previa al escribir', async () => {
    const fixture = TestBed.createComponent(FormularioCatalogo);
    fixture.componentRef.setInput('campos', [
      { nombre: 'generos', etiqueta: 'Géneros', tipo: 'generos', requerido: true },
    ]);
    await fixture.whenStable();
    const cambios = vi.fn();
    fixture.componentInstance.modificado.subscribe(cambios);
    fixture.componentInstance.formulario.controls['generos'].setValue('Comedia');
    fixture.componentInstance.elegirGenero('generos', 'Acción');
    expect(cambios).toHaveBeenLastCalledWith({ generos: 'Comedia, Acción' });
    fixture.componentInstance.elegirGenero('generos', 'COMEDIA');
    expect(fixture.componentInstance.formulario.controls['generos'].value).toBe('Acción');
  });
  it('recibe campos y valores del padre, mantiene los números y emite los datos al guardar', async () => {
    const fixture = TestBed.createComponent(FormularioCatalogo);
    fixture.componentRef.setInput('campos', [
      {
        nombre: 'edadMinima',
        etiqueta: 'Clasificación',
        tipo: 'select',
        requerido: true,
        opciones: [
          { valor: 0, etiqueta: 'ATP' },
          { valor: 13, etiqueta: '+13' },
        ],
      },
      { nombre: 'nombre', etiqueta: 'Nombre', tipo: 'text', requerido: true },
    ]);
    fixture.componentRef.setInput('valores', { edadMinima: 0, nombre: 'Película' });
    await fixture.whenStable();
    expect(fixture.componentInstance.formulario.valid).toBe(true);
    let datos: unknown;
    fixture.componentInstance.guardado.subscribe((valor) => {
      datos = valor;
    });
    fixture.componentInstance.guardar();
    expect(datos).toEqual({ edadMinima: 0, nombre: 'Película' });
    fixture.componentRef.setInput('valores', { edadMinima: 13, nombre: 'Otra película' });
    await fixture.whenStable();
    expect(fixture.componentInstance.formulario.getRawValue()).toEqual({
      edadMinima: 13,
      nombre: 'Otra película',
    });
  });

  it('conserva el borrador cuando el padre actualiza las opciones de categoría', async () => {
    const fixture = TestBed.createComponent(FormularioCatalogo);
    const campos = [{ nombre: 'nombre', etiqueta: 'Nombre', tipo: 'text', requerido: true }];
    fixture.componentRef.setInput('campos', campos);
    fixture.componentRef.setInput('valores', { nombre: '' });
    await fixture.whenStable();
    fixture.componentInstance.formulario.controls['nombre'].setValue('Pochoclos');
    fixture.componentRef.setInput('campos', [
      ...campos,
      {
        nombre: 'categoriaId',
        etiqueta: 'Categoría',
        tipo: 'select',
        opciones: [{ valor: 1, etiqueta: 'Comidas' }],
      },
    ]);
    await fixture.whenStable();
    expect(fixture.componentInstance.formulario.controls['nombre'].value).toBe('Pochoclos');
  });
});
