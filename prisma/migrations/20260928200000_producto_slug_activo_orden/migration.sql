-- Multiproducto (fase 2, paso 1): cada producto tiene slug (URL de su ficha), activo y orden.
-- A los productos que ya existen se les arma el slug con el nombre (sin tildes, en minúsculas,
-- con guiones; si dos quedan iguales, el segundo lleva -2, etc.) y el orden por fecha de creación,
-- así el que hasta ahora era "el producto" (el más viejo) sigue siendo el destacado.

-- AlterTable
ALTER TABLE "Product" ADD COLUMN "slug" TEXT,
ADD COLUMN "activo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "orden" INTEGER NOT NULL DEFAULT 0;

WITH base AS (
  SELECT id, "createdAt",
    COALESCE(NULLIF(trim(BOTH '-' FROM regexp_replace(
      translate(lower(nombre), 'áàäâéèëêíìïîóòöôúùüûñç', 'aaaaeeeeiiiioooouuuunc'),
      '[^a-z0-9]+', '-', 'g')), ''), 'producto') AS s
  FROM "Product"
), numerados AS (
  SELECT id, s, row_number() OVER (PARTITION BY s ORDER BY "createdAt", id) AS n FROM base
)
UPDATE "Product" p
SET slug = CASE WHEN numerados.n = 1 THEN numerados.s ELSE numerados.s || '-' || numerados.n END
FROM numerados
WHERE p.id = numerados.id;

WITH o AS (SELECT id, row_number() OVER (ORDER BY "createdAt", id) AS n FROM "Product")
UPDATE "Product" p SET orden = o.n * 10 FROM o WHERE p.id = o.id;

ALTER TABLE "Product" ALTER COLUMN "slug" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE INDEX "Product_activo_orden_idx" ON "Product"("activo", "orden");
