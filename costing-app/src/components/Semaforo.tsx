import type { Semaforo as SemaforoTipo } from '../lib/types';

const LABEL: Record<SemaforoTipo, string> = {
  verde: 'Al día',
  amarillo: 'Por vencer',
  rojo: 'Desactualizado',
};

export function Semaforo({ estado, dias }: { estado: SemaforoTipo; dias: number | null }) {
  const texto = dias === null ? 'sin fecha' : `hace ${dias} día${dias === 1 ? '' : 's'}`;
  return (
    <span className={`badge badge-${estado}`} title={texto}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {LABEL[estado]}
    </span>
  );
}
