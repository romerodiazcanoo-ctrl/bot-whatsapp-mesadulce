export type Categoria = 'materia_prima' | 'packaging' | 'otro';
export type TipoComponente = 'insumo' | 'preparacion';
export type TipoProducto = 'individual' | 'combo';

export interface Insumo {
  id: number;
  nombre: string;
  categoria: Categoria;
  unidad_base: 'g' | 'ml' | 'unidad';
  unidad_compra: string;
  cantidad_por_compra: number;
  costo_compra: number;
  fecha_costo: string | null; // ISO date
  proveedor: string | null;
  activo: 0 | 1;
}

export interface Preparacion {
  id: number;
  nombre: string;
  descripcion: string | null;
  notas: string | null;
  rinde_cantidad: number;
  rinde_unidad: string;
}

export interface PreparacionComponente {
  id: number;
  preparacion_id: number;
  tipo: TipoComponente;
  referencia_id: number;
  cantidad: number;
  unidad: string;
  orden: number;
}

export interface Receta {
  id: number;
  nombre: string;
  clasificacion: string;
  notas: string | null;
  rendimiento: number;
  rendimiento_unidad: string;
}

export interface RecetaIngrediente {
  id: number;
  receta_id: number;
  tipo: TipoComponente;
  referencia_id: number;
  cantidad: number;
  unidad: string;
  orden: number;
}

export interface PackagingArmado {
  id: number;
  nombre: string;
}

export interface PackagingComponente {
  id: number;
  armado_id: number;
  insumo_id: number;
  cantidad: number;
  unidad: string;
}

export interface Producto {
  id: number;
  nombre: string;
  tipo: TipoProducto;
  packaging_armado_id: number | null;
  precio_actual: number;
  margen_objetivo: number | null;
  activo: 0 | 1;
}

export interface ProductoReceta {
  id: number;
  producto_id: number;
  receta_id: number;
  cantidad: number;
}
