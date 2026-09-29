/**
 * Datos iniciales del negocio de un cliente (clientes/<slug>/seed.ts). Se cargan una vez con
 * `npm run db:seed` al crear la base (cada parte solo si su tabla está vacía, así no pisa lo que
 * se editó en el admin); después se editan desde el admin.
 */
export type SeedCliente = {
  /** Categorías (si la config usa categorías), en el orden en que se muestran. */
  categorias?: { nombre: string; slug: string }[];
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
    /** Slug de una de `categorias`. */
    categoria?: string;
    /** Opciones que elige el comprador (si la config usa opciones de producto). */
    opciones?: { nombre: string; valores: string[] }[];
    /** Se hace a pedido (si la config usa productos a pedido), con su demora. */
    aPedido?: boolean;
    demora?: string;
  }[];
  /**
   * Zonas de envío del checkout, en el orden en que se muestran. Sin costo = a coordinar después de
   * la compra; con costo, se suma al total. Sin ninguna, el checkout no deja pagar.
   */
  zonas?: {
    nombre: string;
    costo?: number;
    /** Debajo de la zona en el checkout */
    aclaracion?: string;
    /** En el resumen de la compra (si no, uno según el costo) */
    detalleResumen?: string;
  }[];
  /** Preguntas frecuentes de /consultas (formato de la respuesta: src/lib/preguntas.ts; variables: src/lib/variables.ts). */
  preguntas: { pregunta: string; respuesta: string; orden: number }[];
  /** Reglas de respuesta automática de Instagram (las variables de src/lib/variables.ts se reemplazan al responder). */
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
