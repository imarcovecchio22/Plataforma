"use client";

import { useEffect } from "react";
import { vaciarCarrito } from "@/lib/carrito";

/** En la página de pago aprobado: lo comprado sale del carrito (si falla el pago, el carrito queda). */
export default function VaciarCarrito() {
  useEffect(() => {
    vaciarCarrito();
  }, []);
  return null;
}
