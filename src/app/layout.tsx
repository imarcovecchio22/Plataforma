import type { Metadata } from "next";
import { Poppins, Fraunces } from "next/font/google";
import "./globals.css";
import { cliente } from "@/plataforma/cliente";
import { variablesDeColor } from "@/plataforma/cliente/colores";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-poppins",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-fraunces",
  display: "swap",
});

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
    locale: "es_AR",
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
    <html lang="es" data-scroll-behavior="smooth">
      <head>
        <style dangerouslySetInnerHTML={{ __html: variablesDeColor(cliente.colores) }} />
      </head>
      <body
        className={`${poppins.variable} ${fraunces.variable} flex min-h-screen flex-col font-sans`}
      >
        {children}
      </body>
    </html>
  );
}
