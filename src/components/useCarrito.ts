"use client";

import { useSyncExternalStore } from "react";
import { carritoEnServidor, escucharCarrito, leerCarrito } from "@/lib/carrito";

/** Los ítems del carrito, actualizados cuando cambian (en esta pestaña o en otra). */
export function useCarrito() {
  return useSyncExternalStore(escucharCarrito, leerCarrito, carritoEnServidor);
}
