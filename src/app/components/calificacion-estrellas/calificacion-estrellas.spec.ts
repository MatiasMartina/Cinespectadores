import { Supabase } from '../../services/supabase';
import { crearSupabaseDePrueba, prepararCatalogoDePrueba } from '../../testing/supabase-pruebas';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CalificacionEstrellas } from './calificacion-estrellas';

describe('CalificacionEstrellas', () => {
  let component: CalificacionEstrellas;
  let fixture: ComponentFixture<CalificacionEstrellas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [{ provide: Supabase, useValue: crearSupabaseDePrueba() }],
      imports: [CalificacionEstrellas],
    }).compileComponents();

    fixture = TestBed.createComponent(CalificacionEstrellas);

    component = fixture.componentInstance;

    fixture.componentRef.setInput('puntaje', 4);

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
