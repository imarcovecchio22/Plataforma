import Link from "next/link";

/** Lo que muestra la tienda mientras no hay ningún producto cargado. */
export default function SinProductos() {
  return (
    <main className="contenedor-publico flex-1 py-16 sm:py-24">
      <div className="velo-texto mx-auto max-w-xl text-center">
        <h1 className="titulo">Todavía no hay productos</h1>
        <p className="texto-suave mt-4">
          Volvé pronto, o escribinos desde{" "}
          <Link href="/consultas" className="font-semibold text-[var(--destacado)] underline underline-offset-4">
            consultas
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
