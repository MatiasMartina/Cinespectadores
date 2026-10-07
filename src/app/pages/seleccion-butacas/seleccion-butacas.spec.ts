import { Supabase } from '../../services/supabase';
import { crearSupabaseDePrueba, prepararCatalogoDePrueba } from '../../testing/supabase-pruebas';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SeleccionButacas } from './seleccion-butacas';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { Usuarios } from '../../services/usuarios';
import { Compra } from '../../services/compra';

describe('SeleccionButacas', () => {
  let component: SeleccionButacas;
  let fixture: ComponentFixture<SeleccionButacas>;

  beforeEach(async () => {
    sessionStorage.clear();
    await TestBed.configureTestingModule({
      imports: [SeleccionButacas],
      providers: [provideRouter([]), { provide: Supabase, useValue: crearSupabaseDePrueba() }],
    }).compileComponents();

    fixture = TestBed.createComponent(SeleccionButacas);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('permite confirmar una película ATP sin sesión ni fecha de nacimiento', () => {
    TestBed.inject(Usuarios).cerrarSesion();
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    component.funcion = {
      id: 3,
      peliculaId: 2,
      fecha: '2099-01-01',
      hora: '16:00',
      salaNumero: 3,
      formato: '2D',
      idioma: 'Castellano',
      precio: 7000,
    };
    component.pelicula = {
      id: 2,
      nombre: 'ATP',
      edadMinima: 0,
      duracionMinutos: 96,
      generos: [],
      imagenUrl: '',
      sinopsis: '',
      cantidadVendida: 0,
    };
    component.butacasSeleccionadas = ['A-4'];
    component.disponibilidadValida.set(true);

    component.confirmarCompra();

    expect(TestBed.inject(Compra).getButacasSeleccionadas()).toEqual(['A-4']);
    expect(navegar).toHaveBeenCalledWith(['/candy-bar']);
  });
});
