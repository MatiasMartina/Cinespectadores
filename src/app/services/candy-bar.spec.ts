import { Supabase } from './supabase';
import { crearSupabaseDePrueba, prepararCatalogoDePrueba } from '../testing/supabase-pruebas';
import { TestBed } from '@angular/core/testing';
import { CandyBar } from './candy-bar';
import { vi } from 'vitest';

describe('CandyBar', () => {
  let service: CandyBar;
  let supabase: ReturnType<typeof crearSupabaseDePrueba>;

  beforeEach(() => {
    supabase = crearSupabaseDePrueba();
    TestBed.configureTestingModule({
      providers: [{ provide: Supabase, useValue: supabase }],
    });
    service = TestBed.inject(CandyBar);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
  it('no atribuye a productos asociados un fallo de conexión al eliminar una categoría', async () => {
    const from = vi.spyOn(supabase.cliente, 'from');
    from.mockReturnValueOnce({
      delete: () => ({
        eq: async () => ({ error: { code: '23503', message: 'foreign key constraint' } }),
      }),
    } as never);
    await expect(service.eliminarCategoria(1)).rejects.toThrow('La categoría tiene productos');
    from.mockReturnValueOnce({
      delete: () => ({ eq: async () => ({ error: { message: 'Failed to fetch' } }) }),
    } as never);
    await expect(service.eliminarCategoria(1)).rejects.toThrow(
      'No se pudo eliminar la categoría. Intentá nuevamente.',
    );
  });
});
