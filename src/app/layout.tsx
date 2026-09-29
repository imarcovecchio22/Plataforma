import type { Metadata } from "next";
import "./globals.css";
import tema from "@cliente/tema";
import { cliente } from "@/plataforma/cliente";
import { variablesDeColor } from "@/plataforma/cliente/colores";
import { atributosDeFondo, variablesDeFuentes } from "@/plataforma/cliente/apariencia";

const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL || cliente.dominio;
const SITE_TITLE = cliente.seo.titulo;
const SITE_DESCRIPTION = cliente.seo.descripcion;

export const metadata: Metadata = {
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
        url: cliente.imagenes.compartir,
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
    images: [cliente.imagenes.compartir],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang={cliente.region.locale.split("-")[0]} data-scroll-behavior="smooth" {...atributosDeFondo(cliente.apariencia)}>
      <head>
        <style dangerouslySetInnerHTML={{ __html: variablesDeColor(cliente.colores) + variablesDeFuentes(cliente.apariencia) }} />
      </head>
      <body
        className={[...(tema.fuentes ?? []), "flex min-h-screen flex-col font-sans"].join(" ")}
      >
        {children}
      </body>
    </html>
  );
}
