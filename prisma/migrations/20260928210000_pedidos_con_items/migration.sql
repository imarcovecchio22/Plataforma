-- Multiproducto (fase 2, paso 4): un pedido tiene ítems. Cada pedido existente pasa a tener un
-- ítem con su producto y su cantidad; el precio unitario sale de su total (que ya tenía aplicada
-- la promo por cantidad) y el nombre, del producto. Recién después se borran las columnas viejas.

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "precioUnitario" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "subtotal" INTEGER NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- Los pedidos que ya existen: un ítem cada uno
INSERT INTO "OrderItem" ("id", "orderId", "productId", "nombre", "precioUnitario", "cantidad", "subtotal")
SELECT gen_random_uuid()::text, o."id", o."productId", p."nombre",
       round(o."total"::numeric / o."cantidad")::int, o."cantidad", o."total"
FROM "Order" o
JOIN "Product" p ON p."id" = o."productId";

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_productId_fkey";

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "productId",
DROP COLUMN "cantidad";
