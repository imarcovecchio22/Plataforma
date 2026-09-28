import { notFound } from "next/navigation";
import { cliente } from "@/plataforma/cliente";

/**
 * Funcionalidades opcionales que cada cliente prende o apaga en config.modulos. Con un módulo
 * apagado: sus rutas de API, crons y webhooks responden 404 (src/proxy.ts), sus páginas del admin
 * también (exigirModulo), no aparece en el menú del admin y lo que muestra en la tienda no está.
 */
export const MODULOS = ["instagram", "autorespuestas", "chatIA", "cotizador"] as const;
export type Modulo = (typeof MODULOS)[number];

/** Rutas de cada módulo (la ruta y todo lo que cuelga de ella). */
export const RUTAS_DE_MODULOS: Record<Modulo, string[]> = {
  // Cronograma, generación de imágenes, aprobación por Telegram y publicación
  instagram: ["/admin/instagram", "/api/admin/instagram", "/api/cron/instagram", "/api/telegram/webhook", "/api/generate", "/api/img"],
  // Respuestas automáticas de DMs y comentarios, con su token de Instagram Login
  autorespuestas: ["/admin/autorespuestas", "/api/admin/autorespuestas", "/api/instagram/webhook", "/api/cron/instagram-token"],
  chatIA: ["/api/chat"],
  // Previsto: cotizador de impresión 3D (todavía sin rutas)
  cotizador: [],
};

/** El módulo al que pertenece una ruta, o null si es de la plataforma. */
export function moduloDeRuta(pathname: string): Modulo | null {
  for (const modulo of MODULOS) {
    if (RUTAS_DE_MODULOS[modulo].some((r) => pathname === r || pathname.startsWith(`${r}/`))) return modulo;
  }
  return null;
}

export function moduloActivo(modulo: Modulo) {
  return cliente.modulos[modulo];
}

/** Para las páginas de un módulo: 404 si el cliente no lo tiene prendido. */
export function exigirModulo(modulo: Modulo) {
  if (!moduloActivo(modulo)) notFound();
}
