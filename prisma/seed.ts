import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import { loadEnvConfig } from "@next/env";
import { PrismaClient } from "@prisma/client";
import type { SeedCliente } from "../src/plataforma/cliente/seed";

// Mismas variables que Next (.env.local, etc.): DATABASE_URL y CLIENTE.
loadEnvConfig(path.resolve(__dirname, ".."), true);

const prisma = new PrismaClient();

async function cargarSeedCliente(): Promise<SeedCliente> {
  const slug = process.env.CLIENTE?.trim();
  if (!slug) throw new Error("Falta la variable de entorno CLIENTE (ej. CLIENTE=melera).");
  const archivo = path.resolve(__dirname, "..", "clientes", slug, "seed.ts");
  if (!fs.existsSync(archivo)) throw new Error(`No existe clientes/${slug}/seed.ts.`);
  const modulo = await import(pathToFileURL(archivo).href);
  return modulo.default?.default ?? modulo.default;
}

async function main() {
  const seed = await cargarSeedCliente();

  // Producto (hasta el paso 13 del plan de la fase 1 sigue siendo el de Melera)
  const existing = await prisma.product.findFirst();
  if (existing) {
    console.log("Ya existe un producto, no se crea uno nuevo:", existing.id);
  } else {
    const product = await prisma.product.create({
      data: {
        nombre: "Miel Artesanal 500g",
        descripcion:
          "Miel pura de abejas, producida por Apícola Mercedes (Tomás Jofré, Buenos Aires). Envasada en frasco de vidrio de 500g.",
        precio: 6000,
        stock: 50,
      },
    });
    console.log("Producto creado:", product);
  }

  // Preguntas frecuentes: solo si la tabla está vacía (no pisa lo que se editó en el admin)
  const preguntas = await prisma.preguntaFrecuente.count();
  if (preguntas > 0) {
    console.log(`Ya hay ${preguntas} preguntas frecuentes, no se cargan las del seed.`);
  } else {
    const { count } = await prisma.preguntaFrecuente.createMany({ data: seed.preguntas });
    console.log(`Preguntas frecuentes cargadas: ${count}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
