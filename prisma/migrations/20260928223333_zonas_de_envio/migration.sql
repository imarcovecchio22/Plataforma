-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "costoEnvio" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "zonaEnvioId" INTEGER;

-- CreateTable
CREATE TABLE "ZonaEnvio" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "costo" INTEGER,
    "aclaracion" TEXT NOT NULL DEFAULT '',
    "detalleResumen" TEXT NOT NULL DEFAULT '',
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ZonaEnvio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ZonaEnvio_activa_orden_idx" ON "ZonaEnvio"("activa", "orden");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_zonaEnvioId_fkey" FOREIGN KEY ("zonaEnvioId") REFERENCES "ZonaEnvio"("id") ON DELETE SET NULL ON UPDATE CASCADE;
