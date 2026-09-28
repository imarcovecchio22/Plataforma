import { esquemaCliente } from "@/plataforma/cliente/esquema";

/**
 * Revisa la config de un cliente. Devuelve la lista de problemas (vacía si está bien), con la
 * ruta del campo adelante para que se entienda qué corregir.
 */
export function problemasDeConfig(slugCarpeta: string, config: unknown): string[] {
  const resultado = esquemaCliente.safeParse(config);
  if (!resultado.success) {
    return resultado.error.issues.map((i) => `${i.path.join(".") || "(config)"}: ${i.message}`);
  }
  if (resultado.data.slug !== slugCarpeta) {
    return [`slug: es "${resultado.data.slug}" pero la carpeta es clientes/${slugCarpeta}`];
  }
  return [];
}
