import type { Metadata } from "next";
import "./globals.css";
import tema from "@cliente/tema";
import { cliente } from "@/plataforma/cliente";
import { variablesDeColor } from "@/plataforma/cliente/colores";
import { atributosDeFondo, variablesDeFuentes } from "@/plataforma/cliente/apariencia";
import { getIdentidad } from "@/lib/identidad";

const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL || cliente.dominio;
const SITE_TITLE = cliente.seo.titulo;
const SITE_DESCRIPTION = cliente.seo.descripcion;

// Todo se arma en cada pedido: la identidad (colores, logo, textos) puede cambiar desde el admin
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  // La imagen para compartir: la de la config o la que cambió el dueño
  const { imagenes } = await getIdentidad();
  return {
    metadataBase: new URL(SITE_URL),
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    openGraph: {
      title: SITE_TITLE,
      description: SITE_DESCRIPTION,
      url: "/",
      siteName: cliente.nombre,
      locale: cliente.region.locale.replace("-", "_"),
      type: "website",
      images: [
        {
          url: imagenes.compartir,
          width: 1200,
          height: 630,
          alt: cliente.seo.altImagen,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: SITE_TITLE,
      description: SITE_DESCRIPTION,
      images: [imagenes.compartir],
    },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const identidad = await getIdentidad();
  return (
    <html lang={cliente.region.locale.split("-")[0]} data-scroll-behavior="smooth" {...atributosDeFondo({ fondo: identidad.fondo })}>
      <head>
        <style dangerouslySetInnerHTML={{ __html: variablesDeColor(identidad.colores) + variablesDeFuentes(cliente.apariencia) }} />
      </head>
      <body
        className={[...(tema.fuentes ?? []), "flex min-h-screen flex-col font-sans"].join(" ")}
      >
        {children}
      </body>
    </html>
  );
}
