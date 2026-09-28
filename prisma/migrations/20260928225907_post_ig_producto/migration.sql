-- AlterTable
ALTER TABLE "PostIG" ADD COLUMN     "productoId" TEXT;

-- AddForeignKey
ALTER TABLE "PostIG" ADD CONSTRAINT "PostIG_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
