-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "image" TEXT,
    "role" TEXT NOT NULL DEFAULT 'LECTOR',
    "isAuthorized" BOOLEAN NOT NULL DEFAULT false,
    "deviceId" TEXT,
    "deviceLabel" TEXT,
    "deviceBoundAt" DATETIME,
    "pendingDeviceId" TEXT,
    "pendingDeviceLabel" TEXT,
    "pendingDeviceRequestedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "product_varieties" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "pesoUnitarioGramos" REAL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "stocks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "varietyId" TEXT NOT NULL,
    "etapa" TEXT NOT NULL,
    "cantidad" REAL NOT NULL DEFAULT 0,
    "actualizadoEn" DATETIME NOT NULL,
    CONSTRAINT "stocks_varietyId_fkey" FOREIGN KEY ("varietyId") REFERENCES "product_varieties" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "stock_movimientos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "varietyId" TEXT NOT NULL,
    "etapa" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "cantidadDelta" REAL NOT NULL,
    "cantidadResultante" REAL NOT NULL,
    "nota" TEXT,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "stock_movimientos_varietyId_fkey" FOREIGN KEY ("varietyId") REFERENCES "product_varieties" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "stock_movimientos_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "produccion_entries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "varietyId" TEXT NOT NULL,
    "pesoMasaGramos" REAL,
    "unidadesResultantes" REAL NOT NULL,
    "nota" TEXT,
    "userId" TEXT,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "produccion_entries_varietyId_fkey" FOREIGN KEY ("varietyId") REFERENCES "product_varieties" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "produccion_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "planes_produccion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "fechaInicio" DATETIME NOT NULL,
    "fechaFin" DATETIME NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "planes_produccion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "plan_produccion_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "planId" TEXT NOT NULL,
    "varietyId" TEXT NOT NULL,
    "unidadesObjetivo" REAL NOT NULL,
    CONSTRAINT "plan_produccion_items_planId_fkey" FOREIGN KEY ("planId") REFERENCES "planes_produccion" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "plan_produccion_items_varietyId_fkey" FOREIGN KEY ("varietyId") REFERENCES "product_varieties" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "product_varieties_nombre_key" ON "product_varieties"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "stocks_varietyId_etapa_key" ON "stocks"("varietyId", "etapa");

-- CreateIndex
CREATE UNIQUE INDEX "plan_produccion_items_planId_varietyId_key" ON "plan_produccion_items"("planId", "varietyId");
