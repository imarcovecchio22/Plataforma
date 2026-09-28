-- CreateTable
CREATE TABLE "PreguntaFrecuente" (
    "id" SERIAL NOT NULL,
    "pregunta" TEXT NOT NULL,
    "respuesta" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PreguntaFrecuente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PreguntaFrecuente_activa_orden_idx" ON "PreguntaFrecuente"("activa", "orden");
