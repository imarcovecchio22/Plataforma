-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "opciones" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "opciones" JSONB NOT NULL DEFAULT '[]';
