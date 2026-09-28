import type { Metadata } from "next";
import { notFound } from "next/navigation";
import FichaProducto from "@/components/FichaProducto";
import { getProductoPorSlug } from "@/lib/product";
import { cliente } from "@/plataforma/cliente";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ origen?: string | string[] }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProductoPorSlug((await params).slug);
  return product ? { title: `${product.nombre} | ${cliente.nombre}`, description: product.descripcion || undefined } : {};
}

export default async function ProductoPorSlugPage({ params, searchParams }: Props) {
  const product = await getProductoPorSlug((await params).slug);
  if (!product) notFound();
  const origen = (await searchParams).origen;
  return <FichaProducto product={product} origen={Array.isArray(origen) ? origen[0] : origen} />;
}
