import { Supabase } from '../../services/supabase';
import { crearSupabaseDePrueba, prepararCatalogoDePrueba } from '../../testing/supabase-pruebas';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FechaNacimiento } from './fecha-nacimiento';

@Component({
  providers: [{ provide: Supabase, useValue: crearSupabaseDePrueba() }],
  imports: [FechaNacimiento, FormsModule, ReactiveFormsModule],
  template: `<app-fecha-nacimiento
      identificador="reactivo"
      [formControl]="fecha"
    ></app-fecha-nacimiento
    ><app-fecha-nacimiento identificador="invitado" [(ngModel)]="invitado"></app-fecha-nacimiento>`,
})
class FormulariosPrueba {
  fecha = new FormControl('01/01/2000', { nonNullable: true });
  invitado = '';
}

describe('FechaNacimiento', () => {
  it('comunica valor, límites, foco y estado deshabilitado con un formulario reactivo', async () => {
    const fixture = TestBed.createComponent(FormulariosPrueba);
    await fixture.whenStable();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('#reactivo');
    expect(input.value).toBe('01/01/2000');
    input.value = '31022023';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(fixture.componentInstance.fecha.value).toBe('28/02/2023');
    expect(input.value).toBe('28/02/2023');
    input.dispatchEvent(new Event('blur'));
    expect(fixture.componentInstance.fecha.touched).toBe(true);
    fixture.componentInstance.fecha.disable();
    await fixture.whenStable();
    expect(input.disabled).toBe(true);
  });

  it('usa las mismas restricciones con ngModel para invitados', async () => {
    const fixture = TestBed.createComponent(FormulariosPrueba);
    await fixture.whenStable();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('#invitado');
    input.value = '29022024';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(fixture.componentInstance.invitado).toBe('29/02/2024');
    input.value = '00130000';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(fixture.componentInstance.invitado).toBe('01/12/1900');
  });
});
