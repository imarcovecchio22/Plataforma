/**
 * Datos iniciales del negocio de un cliente (clientes/<slug>/seed.ts). Se cargan una vez con
 * `npm run db:seed` al crear la base; después se editan desde el admin.
 */
export type SeedCliente = {
  /** Preguntas frecuentes de /consultas (formato de la respuesta: src/lib/preguntas.ts). */
  preguntas: { pregunta: string; respuesta: string; orden: number }[];
};

export function definirSeed(seed: SeedCliente): SeedCliente {
  return seed;
}
