"use client";

import dynamic from "next/dynamic";

// El panal se carga después del render inicial: no suma al HTML ni bloquea el primer pintado.
const Panal = dynamic(() => import("./Panal"), { ssr: false });

export default function PanalDiferido() {
  return <Panal />;
}
