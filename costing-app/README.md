# Mesa Dulce — Costeo

App local de costeo y carta para Mesa Dulce. Reemplaza el Excel `Costeo_carta_MD.xlsx`: todo costo se calcula al momento a partir de los insumos, nunca se guarda ya calculado.

Uso personal, corre en tu computadora. Sin login, sin nube, sin servicios externos.

## Setup

```bash
npm install
npm run import-excel   # lee Costeo_carta_MD.xlsx y carga mesadulce.db (una sola vez, o para re-importar de cero)
npm run dev            # levanta backend (puerto 3001) y frontend (puerto 5173) juntos
```

Abrí http://localhost:5173

## Estructura

```
server/     Express + better-sqlite3 — API REST y motor de cálculo de costos
shared/     Tipos y utilidades de unidades compartidas entre server, scripts y frontend
scripts/    import-excel.ts — importador desde el Excel original
src/        Vite + React + TypeScript + Tailwind — la app
mesadulce.db  Base de datos SQLite (se genera sola, no se versiona)
```

## Modelo de costeo

Insumos → Preparaciones → Recetas → Packaging → Productos. Cada capa se recalcula en vivo a partir de la anterior; cambiar el costo de un insumo actualiza automáticamente todo lo que lo usa, sin ningún paso manual.

## Reimportar desde el Excel

`npm run import-excel` borra y recarga todas las tablas desde `Costeo_carta_MD.xlsx`. Al final imprime:
- Resumen de cuánto se cargó
- Insumos excluidos (los que en realidad son productos, no materia prima)
- Supuestos tomados (sinónimos, precios de respaldo, sub-lotes con rendimientos distintos)
- Diferencias de precio encontradas entre "5) Costo total" y la pivot "finales"
- Verificación del costo por unidad de las 16 recetas contra la hoja "3) costo mp"
