/**
 * Zonas de envío para los mocks de @/lib/zonas, armadas con los seeds de los clientes (así los
 * snapshots de Melera usan las mismas zonas que carga su seed). Uso:
 *   vi.mock("@/lib/zonas", async () => (await import("./zonas-de-prueba")).mockZonas("melera"));
 */
import type { ZonaParaCheckout } from "@/lib/envios";
import seedMelera from "../clientes/melera/seed";
import seedEjemplo from "../clientes/ejemplo/seed";

const SEEDS = { melera: seedMelera, ejemplo: seedEjemplo };

export function zonasDe(cliente: keyof typeof SEEDS): ZonaParaCheckout[] {
  return (SEEDS[cliente].zonas ?? []).map((z, i) => ({
    id: i + 1,
    nombre: z.nombre,
    costo: z.costo ?? null,
    aclaracion: z.aclaracion ?? "",
    detalleResumen: z.detalleResumen ?? "",
  }));
}

export function mockZonas(cliente: keyof typeof SEEDS) {
  return { getZonasActivas: async () => zonasDe(cliente) };
}
