-- El estilo de los posts deja de ser un enum fijo (organico, geo, panal) y pasa a texto: cada
-- cliente declara sus estilos en config.estilosInstagram y la app lo valida.
-- Se convierte en su lugar (USING ...::text), así los posts existentes conservan su estilo.
-- (Prisma proponía borrar la columna y crearla de nuevo, lo que perdía los datos.)

-- AlterTable
ALTER TABLE "PostIG" ALTER COLUMN "estilo" TYPE TEXT USING "estilo"::text;

-- DropEnum
DROP TYPE "EstiloPostIG";
