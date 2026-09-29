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
  if (!slug) throw new Error("Falta la variable de entorno CLIENTE (ej. CLIENTE=ejemplo).");
  const archivo = path.resolve(__dirname, "..", "clientes", slug, "seed.ts");
  if (!fs.existsSync(archivo)) throw new Error(`No existe clientes/${slug}/seed.ts.`);
  const modulo = await import(pathToFileURL(archivo).href);
  return modulo.default?.default ?? modulo.default;
}

async function main() {
  const seed = await cargarSeedCliente();

  // Categorías: solo si no hay ninguna (en el orden del seed)
  const categorias = await prisma.categoria.count();
  if (categorias > 0) {
    console.log(`Ya hay ${categorias} categorías, no se cargan las del seed.`);
  } else if (seed.categorias?.length) {
    const { count } = await prisma.categoria.createMany({
      data: seed.categorias.map((c, i) => ({ ...c, orden: (i + 1) * 10 })),
    });
    console.log(`Categorías cargadas: ${count}`);
  }
  const idDeCategoria = new Map((await prisma.categoria.findMany()).map((c) => [c.slug, c.id]));

  // Productos: solo si no hay ninguno (en el orden del seed)
  const productos = await prisma.product.count();
  if (productos > 0) {
    console.log(`Ya hay ${productos} productos, no se cargan los del seed.`);
  } else if (seed.productos?.length) {
    const { count } = await prisma.product.createMany({
      data: seed.productos.map(({ categoria, ...p }, i) => ({
        ...p,
        orden: (i + 1) * 10,
        categoriaId: categoria ? (idDeCategoria.get(categoria) ?? null) : null,
      })),
    });
    console.log(`Productos cargados: ${count}`);
  } else {
    console.log("El seed del cliente no trae productos: la tienda va a mostrar que todavía no hay.");
  }

  // Zonas de envío: solo si no hay ninguna (en el orden del seed)
  const zonas = await prisma.zonaEnvio.count();
  if (zonas > 0) {
    console.log(`Ya hay ${zonas} zonas de envío, no se cargan las del seed.`);
  } else if (seed.zonas?.length) {
    const { count } = await prisma.zonaEnvio.createMany({
      data: seed.zonas.map((z, i) => ({ ...z, orden: (i + 1) * 10 })),
    });
    console.log(`Zonas de envío cargadas: ${count}`);
  } else {
    console.log("El seed del cliente no trae zonas de envío: el checkout no va a dejar pagar hasta cargar una.");
  }

  // Preguntas frecuentes: solo si la tabla está vacía (no pisa lo que se editó en el admin)
  const preguntas = await prisma.preguntaFrecuente.count();
  if (preguntas > 0) {
    console.log(`Ya hay ${preguntas} preguntas frecuentes, no se cargan las del seed.`);
  } else {
    const { count } = await prisma.preguntaFrecuente.createMany({ data: seed.preguntas });
    console.log(`Preguntas frecuentes cargadas: ${count}`);
  }

  // Respuestas automáticas de Instagram: solo si no hay ninguna
  const reglas = await prisma.autoRespuesta.count();
  if (reglas > 0) {
    console.log(`Ya hay ${reglas} respuestas automáticas, no se cargan las del seed.`);
  } else if (seed.autorespuestas?.length) {
    const { count } = await prisma.autoRespuesta.createMany({ data: seed.autorespuestas });
    console.log(`Respuestas automáticas cargadas: ${count}`);
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
