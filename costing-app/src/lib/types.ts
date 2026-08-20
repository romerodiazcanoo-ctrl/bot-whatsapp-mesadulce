export type Semaforo = 'verde' | 'amarillo' | 'rojo';

export interface InsumoDTO {
  id: number;
  nombre: string;
  categoria: 'materia_prima' | 'packaging' | 'otro';
  unidad_base: 'g' | 'ml' | 'unidad';
  unidad_compra: string;
  cantidad_por_compra: number;
  costo_compra: number;
  fecha_costo: string | null;
  proveedor: string | null;
  activo: 0 | 1;
  costoUnitario: number;
  costoLegible: number;
  unidadLegible: string;
  semaforo: Semaforo;
  diasDesdeActualizacion: number | null;
}

export interface ComponenteDTO {
  id: number;
  tipo: 'insumo' | 'preparacion';
  referenciaId: number;
  nombre: string;
  cantidad: number;
  unidad: string;
  costoUnitarioReferencia: number;
  costoParcial: number;
  porcentaje: number;
  desactualizado: boolean;
}

export interface PreparacionDTO {
  id: number;
  nombre: string;
  descripcion: string | null;
  notas: string | null;
  rinde_cantidad: number;
  rinde_unidad: string;
  costoPorUnidad: number;
  desactualizado: boolean;
  error: string | null;
}

export interface PreparacionDetalleDTO extends PreparacionDTO {
  calculo: {
    nombre: string;
    costoTotal: number;
    costoPorUnidad: number;
    desactualizado: boolean;
    componentes: ComponenteDTO[];
  };
}

export interface RecetaDTO {
  id: number;
  nombre: string;
  clasificacion: string;
  notas: string | null;
  rendimiento: number;
  rendimiento_unidad: string;
  costoPorUnidad: number;
  desactualizado: boolean;
}

export interface RecetaDetalleDTO extends RecetaDTO {
  calculo: {
    nombre: string;
    clasificacion: string;
    rendimiento: number;
    rendimientoUnidad: string;
    costoTotal: number;
    costoPorUnidad: number;
    desactualizado: boolean;
    ingredientes: ComponenteDTO[];
  };
}

export interface PackagingArmadoDTO {
  id: number;
  nombre: string;
  costoTotal: number;
}

export interface PackagingComponenteDTO {
  id: number;
  armado_id: number;
  insumo_id: number;
  cantidad: number;
  unidad: string;
}

export interface PackagingDetalleDTO extends PackagingArmadoDTO {
  componentes: PackagingComponenteDTO[];
}

export interface ProductoCalculoDTO {
  nombre: string;
  tipo: 'individual' | 'combo';
  costoMateriaPrima: number;
  costoPackaging: number;
  costoTotal: number;
  precioActual: number;
  margenObjetivo: number;
  margenActual: number;
  markupActual: number;
  precioSugerido: number;
  diferenciaPesos: number;
  diferenciaPorcentaje: number;
  desactualizado: boolean;
  recetas: Array<{
    recetaId: number;
    nombre: string;
    cantidad: number;
    costoUnitario: number;
    costoParcial: number;
    desactualizado: boolean;
  }>;
}

export interface ProductoDTO {
  id: number;
  nombre: string;
  tipo: 'individual' | 'combo';
  packaging_armado_id: number | null;
  precio_actual: number;
  margen_objetivo: number | null;
  activo: 0 | 1;
  calculo: ProductoCalculoDTO;
}

export interface DashboardDTO {
  insumosDesactualizados: Array<{ id: number; nombre: string }>;
  cantidadInsumosDesactualizados: number;
  productosBajoSugerido: Array<{ id: number; nombre: string } & ProductoCalculoDTO>;
  topInsumos: Array<{ insumoId: number; nombre: string; costo: number; porcentaje: number }>;
  ultimaActualizacion: string | null;
}

export interface ConfigDTO {
  margen_objetivo_default: string;
  umbral_dias_amarillo: string;
  umbral_dias_rojo: string;
  redondeo_lista_precios: string;
  [key: string]: string;
}
