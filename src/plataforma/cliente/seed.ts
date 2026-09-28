/**
 * Datos iniciales del negocio de un cliente (clientes/<slug>/seed.ts). Se cargan una vez con
 * `npm run db:seed` al crear la base (cada parte solo si su tabla está vacía, así no pisa lo que
 * se editó en el admin); después se editan desde el admin.
 */
export type SeedCliente = {
  /** Productos de la tienda, en el orden en que se muestran. Sin ninguno, la tienda muestra "todavía no hay productos". */
  productos?: {
    nombre: string;
    /** Para la URL de la ficha: /producto/<slug> (minúsculas, números y guiones). */
    slug: string;
    descripcion: string;
    /** En pesos, sin centavos. */
    precio: number;
    stock: number;
    /** Promos por cantidad: precio por unidad desde cierta cantidad. */
    escalones?: { desde: number; precio: number }[];
  }[];
  /** Preguntas frecuentes de /consultas (formato de la respuesta: src/lib/preguntas.ts). */
  preguntas: { pregunta: string; respuesta: string; orden: number }[];
  /** Reglas de respuesta automática de Instagram ($PRECIO y $PROMOS se reemplazan al responder). */
  autorespuestas?: {
    nombre: string;
    palabrasClave: string[];
    coincidencia: "contiene" | "exacta";
    canal: "dm" | "comentario" | "ambos";
    respuesta: string;
    botones: { titulo: string; url: string }[];
    respuestaPublicaComentario?: string;
    prioridad: number;
    activa: boolean;
  }[];
};

export function definirSeed(seed: SeedCliente): SeedCliente {
  return seed;
}
