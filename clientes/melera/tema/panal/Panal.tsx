"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ENTRADA_VISTA_KEY, LOGO_ENTRADA_URL } from "./config";
import { MotorPanal } from "./motor";
import { Abeja } from "./abeja";
import { quitarVeloEntrada } from "./velo";

function entradaYaVista() {
  try {
    return sessionStorage.getItem(ENTRADA_VISTA_KEY) === "1";
  } catch {
    return true; // sin sessionStorage (modo privado estricto): mejor no repetir la entrada en cada visita
  }
}

function marcarEntradaVista() {
  try {
    sessionStorage.setItem(ENTRADA_VISTA_KEY, "1");
  } catch {
    // no pasa nada: a lo sumo se vuelve a ver
  }
}

/**
 * Fondo de panal en canvas (fijo, detrás del contenido) + canvas de efectos (entrada y abeja,
 * encima, sin capturar clics). La entrada va solo en la home, una vez por sesión.
 * No se monta en /checkout (tiene su propio layout, sin panal ni abeja).
 */
export default function Panal() {
  const fondo = useRef<HTMLCanvasElement>(null);
  const efectos = useRef<HTMLCanvasElement>(null);
  const motor = useRef<MotorPanal | null>(null);
  const logo = useRef<HTMLImageElement | null>(null);
  const [saltarVisible, setSaltarVisible] = useState(false);
  const pathname = usePathname();
  const esHome = pathname === "/";

  useEffect(() => {
    if (!fondo.current || !efectos.current) return;
    const entrada = esHome && !entradaYaVista();
    // El logo solo se pide si hay entrada (misma URL que el velo: ya está en caché)
    logo.current = new Image();
    if (entrada) logo.current.src = LOGO_ENTRADA_URL;
    const m = new MotorPanal({
      fondo: fondo.current,
      efectos: efectos.current,
      entrada,
      logoEntrada: logo.current,
      actor: new Abeja(),
      onEntrada: (activa) => {
        setSaltarVisible(activa);
        if (activa) {
          marcarEntradaVista();
          quitarVeloEntrada();
        }
      },
    });
    motor.current = m;
    m.iniciar();
    // Sin entrada (ya vista o "reducir movimiento"), el velo previo no tiene que quedar.
    if (!entrada) quitarVeloEntrada();
    return () => {
      m.destruir();
      motor.current = null;
    };
    // El motor vive mientras dure el layout público; la home se maneja en el efecto de abajo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Llegar a la home navegando dentro del sitio también muestra la entrada, si no se vio en la sesión.
  const primeraRuta = useRef(pathname);
  useEffect(() => {
    if (pathname === primeraRuta.current) return;
    primeraRuta.current = pathname;
    if (esHome && !entradaYaVista()) {
      if (logo.current && !logo.current.src) logo.current.src = LOGO_ENTRADA_URL;
      motor.current?.reproducirEntrada();
    }
    else motor.current?.terminarEntrada();
  }, [pathname, esHome]);

  return (
    <>
      <canvas ref={fondo} className="pointer-events-none fixed inset-0 z-0 block h-full w-full" aria-hidden="true" />
      <canvas ref={efectos} className="pointer-events-none fixed inset-0 z-50 block h-full w-full" aria-hidden="true" />
      {saltarVisible && (
        <button type="button" className="boton-saltar" onClick={() => motor.current?.terminarEntrada()}>
          Saltar
        </button>
      )}
    </>
  );
}
