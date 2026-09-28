import { getProductosActivos } from "@/lib/product";
import { getZonasActivas } from "@/lib/zonas";
import { textosDelProducto } from "@/lib/precios";
import { textoCatalogo, textoZonas, type DatosTextos } from "@/lib/variables";

/**
 * Los valores de las variables ($PRODUCTO, $PRECIO, $PROMOS, $CATALOGO, $ZONAS) con los datos
 * actuales de la base. El producto destacado es el primero activo (igual que getMainProduct).
 */
export async function datosParaTextos(): Promise<DatosTextos> {
  const [productos, zonas] = await Promise.all([getProductosActivos(), getZonasActivas()]);
  const { nombre, precio, promos } = textosDelProducto(productos[0] ?? null);
  return { nombre, precio, promos, catalogo: textoCatalogo(productos), zonas: textoZonas(zonas) };
}
