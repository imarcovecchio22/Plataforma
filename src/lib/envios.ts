/**
 * Zonas de envío (tabla ZonaEnvio, se editan en /admin/envios). Sin dependencias de servidor: lo
 * usan el checkout (formulario) y la API.
 */
import { formatPrecio } from "@/lib/utils";

export type ZonaParaCheckout = {
  id: number;
  nombre: string;
  /** null = a coordinar después de la compra */
  costo: number | null;
  aclaracion: string;
  detalleResumen: string;
};

/** Lo que dice el resumen de la compra sobre el envío a esa zona. */
export function textoResumenEnvio(zona: ZonaParaCheckout) {
  if (zona.detalleResumen) return zona.detalleResumen;
  return zona.costo === null
    ? `Envío a ${zona.nombre}: lo coordinamos después de la compra.`
    : `Envío a ${zona.nombre}: ${formatPrecio(zona.costo)}`;
}

/** "CABA — $ 2.500" / "Resto del país — a coordinar" (opciones del selector). */
export function etiquetaZona(zona: ZonaParaCheckout) {
  return `${zona.nombre} — ${zona.costo === null ? "a coordinar" : formatPrecio(zona.costo)}`;
}
