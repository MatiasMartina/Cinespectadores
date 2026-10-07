import { ProductoCandy } from '../models/producto-candy';
import { CategoriaCandy } from '../models/categoria-candy';
export const CATEGORIAS_INICIALES: CategoriaCandy[] = [
  { id: 1, nombre: 'Comidas' },
  { id: 2, nombre: 'Bebidas' },
  { id: 3, nombre: 'Golosinas' },
  { id: 4, nombre: 'Postres' },
  { id: 5, nombre: 'Combos' },
];
export const PRODUCTOS_INICIALES: ProductoCandy[] = [
  {
    id: 1,
    nombre: 'Pochoclos grandes',
    precio: 4500,
    categoriaId: 1,
    imagenUrl:
      'https://images.unsplash.com/photo-1432139523732-e9d8af332501?auto=format&fit=crop&w=600&h=450&q=85',
  },
  {
    id: 2,
    nombre: 'Gaseosa grande',
    precio: 3000,
    categoriaId: 2,
    imagenUrl:
      'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&h=450&q=85',
  },
  {
    id: 3,
    nombre: 'Nachos con queso',
    precio: 5000,
    categoriaId: 1,
    imagenUrl:
      'https://images.unsplash.com/photo-1570466199120-80bba1eabad7?auto=format&fit=crop&w=600&h=450&q=85',
  },
  {
    id: 4,
    nombre: 'Combo Cine spectadores',
    precio: 7000,
    categoriaId: 5,
    imagenUrl:
      'https://images.unsplash.com/photo-1585647347483-22b66260dfff?auto=format&fit=crop&w=600&h=450&q=85',
  },
  {
    id: 5,
    nombre: 'Pancho clásico',
    precio: 3800,
    categoriaId: 1,
    imagenUrl:
      'https://images.unsplash.com/photo-1768250708131-23da8d1cb5ad?auto=format&fit=crop&w=600&h=450&q=85',
  },
  {
    id: 6,
    nombre: 'Papas fritas',
    precio: 4200,
    categoriaId: 1,
    imagenUrl:
      'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=600&h=450&q=85',
  },
  {
    id: 7,
    nombre: 'Gomitas de ositos',
    precio: 2200,
    categoriaId: 3,
    imagenUrl:
      'https://images.unsplash.com/photo-1682941379468-c42a219c0376?auto=format&fit=crop&w=600&h=450&q=85',
  },
  {
    id: 8,
    nombre: 'Chocolate en trozos',
    precio: 2800,
    categoriaId: 3,
    imagenUrl:
      'https://images.unsplash.com/photo-1511381939415-e44015466834?auto=format&fit=crop&w=600&h=450&q=85',
  },
  {
    id: 9,
    nombre: 'Cookies con chips',
    precio: 2500,
    categoriaId: 3,
    imagenUrl:
      'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=600&h=450&q=85',
  },
  {
    id: 10,
    nombre: 'Copa helada de chocolate',
    precio: 4600,
    categoriaId: 4,
    imagenUrl:
      'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=600&h=450&q=85',
  },
  {
    id: 11,
    nombre: 'Café con leche',
    precio: 2600,
    categoriaId: 2,
    imagenUrl:
      'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=600&h=450&q=85',
  },
  {
    id: 12,
    nombre: 'Helado con salsa de caramelo',
    precio: 4300,
    categoriaId: 4,
    imagenUrl:
      'https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=600&h=450&q=85',
  },
  {
    id: 13,
    nombre: 'Tubo de papas',
    precio: 3200,
    categoriaId: 1,
    imagenUrl:
      'https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=600&q=85',
  },
  {
    id: 14,
    nombre: 'Alfajor triple',
    precio: 2200,
    categoriaId: 3,
    imagenUrl:
      'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=600&q=85',
  },
  {
    id: 15,
    nombre: 'Agua mineral',
    precio: 1800,
    categoriaId: 2,
    imagenUrl:
      'https://images.unsplash.com/photo-1564419320461-6870880221ad?auto=format&fit=crop&w=600&q=85',
  },
  {
    id: 16,
    nombre: 'Combo para compartir',
    precio: 11500,
    categoriaId: 5,
    imagenUrl:
      'https://images.unsplash.com/photo-1578849278619-e73505e9610f?auto=format&fit=crop&w=600&q=85',
  },
];
