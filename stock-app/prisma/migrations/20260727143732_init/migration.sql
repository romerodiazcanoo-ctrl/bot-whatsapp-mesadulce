-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'EDITOR', 'LECTOR');

-- CreateEnum
CREATE TYPE "Categoria" AS ENUM ('COOKIE_CLASICA', 'COOKIE_RELLENA', 'BROWNIE');

-- CreateEnum
CREATE TYPE "Etapa" AS ENUM ('CRUDO', 'HORNEADO_CONGELADO', 'BROWNIE_PORCIONES');

-- CreateEnum
CREATE TYPE "TipoMovimiento" AS ENUM ('AJUSTE_MANUAL', 'PRODUCCION', 'HORNEADO_INGRESO', 'HORNEADO_EGRESO');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "image" TEXT,
    "role" "Role" NOT NULL DEFAULT 'LECTOR',
    "isAuthorized" BOOLEAN NOT NULL DEFAULT false,
    "deviceId" TEXT,
    "deviceLabel" TEXT,
    "deviceBoundAt" TIMESTAMP(3),
    "pendingDeviceId" TEXT,
    "pendingDeviceLabel" TEXT,
    "pendingDeviceRequestedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_varieties" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoria" "Categoria" NOT NULL,
    "pesoUnitarioGramos" DOUBLE PRECISION,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_varieties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stocks" (
    "id" TEXT NOT NULL,
    "varietyId" TEXT NOT NULL,
    "etapa" "Etapa" NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movimientos" (
    "id" TEXT NOT NULL,
    "varietyId" TEXT NOT NULL,
    "etapa" "Etapa" NOT NULL,
    "tipo" "TipoMovimiento" NOT NULL,
    "cantidadDelta" DOUBLE PRECISION NOT NULL,
    "cantidadResultante" DOUBLE PRECISION NOT NULL,
    "nota" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movimientos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "produccion_entries" (
    "id" TEXT NOT NULL,
    "varietyId" TEXT NOT NULL,
    "pesoMasaGramos" DOUBLE PRECISION,
    "unidadesResultantes" DOUBLE PRECISION NOT NULL,
    "nota" TEXT,
    "userId" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "produccion_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planes_produccion" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "planes_produccion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_produccion_items" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "varietyId" TEXT NOT NULL,
    "unidadesObjetivo" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "plan_produccion_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "product_varieties_nombre_key" ON "product_varieties"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "stocks_varietyId_etapa_key" ON "stocks"("varietyId", "etapa");

-- CreateIndex
CREATE UNIQUE INDEX "plan_produccion_items_planId_varietyId_key" ON "plan_produccion_items"("planId", "varietyId");

-- AddForeignKey
ALTER TABLE "stocks" ADD CONSTRAINT "stocks_varietyId_fkey" FOREIGN KEY ("varietyId") REFERENCES "product_varieties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movimientos" ADD CONSTRAINT "stock_movimientos_varietyId_fkey" FOREIGN KEY ("varietyId") REFERENCES "product_varieties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movimientos" ADD CONSTRAINT "stock_movimientos_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produccion_entries" ADD CONSTRAINT "produccion_entries_varietyId_fkey" FOREIGN KEY ("varietyId") REFERENCES "product_varieties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produccion_entries" ADD CONSTRAINT "produccion_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planes_produccion" ADD CONSTRAINT "planes_produccion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_produccion_items" ADD CONSTRAINT "plan_produccion_items_planId_fkey" FOREIGN KEY ("planId") REFERENCES "planes_produccion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_produccion_items" ADD CONSTRAINT "plan_produccion_items_varietyId_fkey" FOREIGN KEY ("varietyId") REFERENCES "product_varieties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
