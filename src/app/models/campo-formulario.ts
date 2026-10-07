export type ValorFormulario = string | number | boolean | null;
export type DatosFormulario = Record<string, ValorFormulario>;

export interface CampoFormulario {
  nombre: string;
  etiqueta: string;
  tipo:
    | 'text'
    | 'email'
    | 'password'
    | 'number'
    | 'date'
    | 'textarea'
    | 'select'
    | 'checkbox'
    | 'generos';
  requerido?: boolean;
  minimo?: number;
  maximo?: number;
  opciones?: { valor: string | number; etiqueta: string }[];
  ayuda?: string;
  anchoCompleto?: boolean;
  patron?: RegExp;
  mensajePatron?: string;
  entero?: boolean;
}
