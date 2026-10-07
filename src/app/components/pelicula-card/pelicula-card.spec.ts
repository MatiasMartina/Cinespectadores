import { Supabase } from '../../services/supabase';
import { crearSupabaseDePrueba, prepararCatalogoDePrueba } from '../../testing/supabase-pruebas';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PeliculaCard } from './pelicula-card';
import { provideRouter } from '@angular/router';

describe('PeliculaCard', () => {
  let component: PeliculaCard;
  let fixture: ComponentFixture<PeliculaCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PeliculaCard],
      providers: [provideRouter([]), { provide: Supabase, useValue: crearSupabaseDePrueba() }],
    }).compileComponents();

    fixture = TestBed.createComponent(PeliculaCard);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('pelicula', { id: 1, titulo: 'Test' } as any);

    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
