import type { Metadata } from "next";
import CarritoVista from "@/components/CarritoVista";
import { getProductosActivos } from "@/lib/product";
import { leerEscalones } from "@/lib/precios";
import { cliente, unidadDe } from "@/plataforma/cliente";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: `Carrito | ${cliente.nombre}` };

export default async function CarritoPage() {
  // Los datos actuales de lo que está a la venta: el carrito del navegador guarda solo slug y cantidad
  const productos = (await getProductosActivos()).map((p) => ({
    slug: p.slug,
    nombre: p.nombre,
    precio: p.precio,
    escalones: leerEscalones(p.escalones),
    stock: p.stock,
    unidad: unidadDe(p),
  }));

  return (
    <main className="contenedor-publico flex-1 py-10 sm:py-16">
      <div className="mx-auto max-w-[1100px]">
        <h1 className="titulo velo-texto mb-8">Carrito</h1>
        <CarritoVista productos={productos} />
      </div>
    </main>
  );
}
