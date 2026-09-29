import type { ComponentType } from "react";

/**
 * Lo que un tema aporta a las páginas públicas, además de su CSS (clientes/<slug>/tema.css).
 * Cada cliente lo exporta en clientes/<slug>/tema/index.tsx; todo es opcional.
 */
export type TemaPublico = {
  /**
   * Primer cuadro de una entrada animada en la home, antes de que cargue el JS (script en línea +
   * HTML). Va arriba de todo en el layout público.
   */
  Entrada?: ComponentType;
  /**
   * Fondo animado detrás de las páginas públicas (no en el checkout). Los elementos que no
   * tiene que tapar llevan el atributo data-fondo-evita.
   */
  Fondo?: ComponentType;
  /**
   * Fuentes de todo el sitio (también el admin): las clases `.variable` de next/font que definen
   * --fuente-texto y --fuente-titulos. Sin ellas se usan las del sistema.
   */
  fuentes?: string[];
  /**
   * Logo al lado del nombre en el Header y el Footer. Sin él, va solo el nombre. `src` es el logo
   * de la identidad (el de la config o el que cambió el dueño); un tema con su propio logo puede
   * ignorarlo.
   */
  Logo?: ComponentType<{ tamano: number; src?: string }>;
};
