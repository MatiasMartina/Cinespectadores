import { Supabase } from '../../services/supabase';
import { crearSupabaseDePrueba, prepararCatalogoDePrueba } from '../../testing/supabase-pruebas';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfirmacionCompra } from './confirmacion-compra';
import { provideRouter } from '@angular/router';

describe('ConfirmacionCompra', () => {
  let component: ConfirmacionCompra;
  let fixture: ComponentFixture<ConfirmacionCompra>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmacionCompra],
      providers: [provideRouter([]), { provide: Supabase, useValue: crearSupabaseDePrueba() }],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmacionCompra);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
