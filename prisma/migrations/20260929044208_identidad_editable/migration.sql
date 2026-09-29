-- CreateTable
CREATE TABLE "IdentidadCliente" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "valores" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdentidadCliente_pkey" PRIMARY KEY ("id")
);
