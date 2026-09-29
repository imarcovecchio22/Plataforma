"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { formatPrecio } from "@/lib/utils";
import { totalPedido, type Escalon } from "@/lib/precios";
import { lineasDelCarrito } from "@/lib/carrito";
import { textoOpciones, type Eleccion, type OpcionElegida } from "@/lib/opciones";
import { etiquetaZona, textoResumenEnvio, type ZonaParaCheckout } from "@/lib/envios";
import { useCarrito } from "@/components/useCarrito";
import type { ProductoCarrito } from "@/components/CarritoVista";
import { cadaUnoDe, cantidadConUnidad, type Unidad } from "@/plataforma/cliente";

type Props = {
  /** Compra de un producto (la ficha con "Comprar", o los links de siempre). */
  producto?: {
    slug: string;
    nombre: string;
    precio: number;
    escalones: Escalon[];
    unidad: Unidad;
    /** Si se hace a pedido, el aviso de demora */
    demora?: string | null;
    /** Lo elegido en la ficha, si el producto tiene opciones */
    opciones?: Eleccion;
    elegidas?: OpcionElegida[];
  };
  cantidadInicial?: number;
  /** Compra del carrito: los productos a la venta, con los datos actuales (el carrito guarda slug y cantidad). */
  carrito?: ProductoCarrito[];
  /** Zonas de envío activas: con una sola, se elige sola; con varias, el comprador elige. */
  zonas: ZonaParaCheckout[];
  origen?: string;
};

const sinSuscripcion = () => () => {};

export default function CheckoutForm({ producto, cantidadInicial = 1, carrito, zonas, origen }: Props) {
  const [cantidad, setCantidad] = useState(cantidadInicial);
  const [zonaId, setZonaId] = useState<number | null>(zonas.length === 1 ? zonas[0].id : null);
  const zona = zonas.find((z) => z.id === zonaId);
  // Solo para mostrar: el servidor vuelve a calcular todo (y el envío) con los datos de la base
  const costoEnvio = zona?.costo ?? 0;
  const itemsCarrito = useCarrito();
  // El carrito vive en el navegador: hasta leerlo no se muestra el formulario
  const listo = useSyncExternalStore(sinSuscripcion, () => true, () => false);
  const lineas = carrito ? lineasDelCarrito(itemsCarrito, carrito) : null;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const payload = Object.fromEntries(formData.entries());
    if (lineas) {
      payload.items = lineas.lineas.map((l) => ({
        producto: l.producto.slug,
        cantidad: l.cantidad,
        ...(l.item.opciones ? { opciones: l.item.opciones } : {}),
      })) as never;
    } else if (producto) {
      payload.cantidad = String(cantidad);
      payload.producto = producto.slug;
      if (producto.opciones) payload.opciones = producto.opciones as never;
    }
    if (origen) payload.origen = origen;

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Ocurrió un error, intentá de nuevo.");
        setLoading(false);
        return;
      }

      window.location.href = data.redirectUrl;
    } catch {
      setError("No pudimos conectar con el servidor. Intentá de nuevo.");
      setLoading(false);
    }
  }

  if (lineas && !listo) return null;
  if (lineas && lineas.lineas.length === 0) {
    return (
      <div className="tarjeta p-8 text-center">
        <p className="text-[var(--texto)]">Tu carrito está vacío.</p>
        <Link href="/productos" className="btn mt-6">
          Ver productos
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-8 lg:grid-cols-3 lg:gap-12">
      <div className="space-y-6 lg:col-span-2">
        <fieldset className="space-y-4">
          <legend className="mb-1 font-serif text-xl font-semibold text-[var(--texto)]">
            Tus datos
          </legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="etiqueta" htmlFor="nombre">Nombre</label>
              <input className="campo" id="nombre" name="nombre" required />
            </div>
            <div>
              <label className="etiqueta" htmlFor="apellido">Apellido</label>
              <input className="campo" id="apellido" name="apellido" required />
            </div>
            <div>
              <label className="etiqueta" htmlFor="email">Email</label>
              <input className="campo" id="email" name="email" type="email" required />
            </div>
            <div>
              <label className="etiqueta" htmlFor="telefono">Teléfono</label>
              <input className="campo" id="telefono" name="telefono" type="tel" required />
            </div>
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="mb-1 font-serif text-xl font-semibold text-[var(--texto)]">
            Dirección de entrega
          </legend>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="etiqueta" htmlFor="calle">Calle</label>
              <input className="campo" id="calle" name="calle" required />
            </div>
            <div>
              <label className="etiqueta" htmlFor="numero_dir">Número</label>
              <input className="campo" id="numero_dir" name="numero_dir" required />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="etiqueta" htmlFor="pisoDepto">Piso / Depto (opcional)</label>
              <input className="campo" id="pisoDepto" name="pisoDepto" />
            </div>
            <div>
              <label className="etiqueta" htmlFor="localidad">Localidad</label>
              <input className="campo" id="localidad" name="localidad" required />
            </div>
            <div>
              <label className="etiqueta" htmlFor="codigoPostal">Código postal</label>
              <input className="campo" id="codigoPostal" name="codigoPostal" required />
            </div>
          </div>
          <div>
            {zonas.length === 0 ? (
              <p className="text-sm texto-suave">
                Todavía no hay zonas de envío. Escribinos desde{" "}
                <Link href="/consultas" className="font-semibold text-[var(--destacado)] underline underline-offset-4">
                  consultas
                </Link>{" "}
                y lo coordinamos.
              </p>
            ) : zonas.length === 1 ? (
              // Una sola zona: se muestra fija (se elige sola)
              <>
                <label className="etiqueta" htmlFor="provincia">Zona de envío</label>
                <input
                  className="campo opacity-80"
                  id="provincia"
                  value={zonas[0].nombre}
                  readOnly
                  {...(zonas[0].aclaracion ? { "aria-describedby": "zona-ayuda" } : {})}
                />
                <input type="hidden" name="zona" value={zonas[0].id} />
              </>
            ) : (
              <>
                <label className="etiqueta" htmlFor="zona">Zona de envío</label>
                <select
                  className="campo"
                  id="zona"
                  name="zona"
                  required
                  value={zonaId ?? ""}
                  onChange={(e) => setZonaId(Number(e.target.value))}
                  {...(zona?.aclaracion ? { "aria-describedby": "zona-ayuda" } : {})}
                >
                  <option value="" disabled>
                    Elegí la zona
                  </option>
                  {zonas.map((z) => (
                    <option key={z.id} value={z.id}>
                      {etiquetaZona(z)}
                    </option>
                  ))}
                </select>
              </>
            )}
            {zona?.aclaracion && (
              <p id="zona-ayuda" className="mt-1 text-xs texto-suave">
                {zona.aclaracion}
              </p>
            )}
          </div>
        </fieldset>
      </div>

      <div className="h-fit tarjeta p-6">
        <h2 className="font-serif text-xl font-semibold text-[var(--texto)]">Resumen</h2>
        {lineas ? (
          <ResumenCarrito lineas={lineas.lineas} total={lineas.total} envio={costoEnvio} />
        ) : (
          producto && <ResumenProducto producto={producto} cantidad={cantidad} setCantidad={setCantidad} envio={costoEnvio} />
        )}
        {zona && <p className="mt-2 text-xs texto-suave">{textoResumenEnvio(zona)}</p>}

        {error && (
          <p className="mt-4 rounded-lg border aviso-error px-3 py-2 text-sm">{error}</p>
        )}

        <button type="submit" className="btn mt-6 w-full" disabled={loading || zonas.length === 0}>
          {loading ? "Redirigiendo a MercadoPago..." : "Ir a pagar"}
        </button>
      </div>
    </form>
  );
}

/** Resumen de la compra de un producto (con cantidad y el aviso de la próxima promo). */
function ResumenProducto({
  producto,
  cantidad,
  setCantidad,
  envio,
}: {
  producto: NonNullable<Props["producto"]>;
  cantidad: number;
  setCantidad: (f: (c: number) => number) => void;
  envio: number;
}) {
  // Solo para mostrar: el total que se cobra lo calcula el servidor con los mismos escalones
  const { unitario, total, ahorro } = totalPedido(producto.precio, producto.escalones, cantidad);
  const proximo = producto.escalones.find((e) => e.desde > cantidad && e.precio < unitario);
  return (
    <>
    <div className="mt-4 flex items-center justify-between text-sm texto-suave">
      <span>
        {producto.nombre}
        {producto.elegidas?.length ? <span className="block text-xs text-[var(--texto)]">{textoOpciones(producto.elegidas)}</span> : null}
        {producto.demora && <span className="block text-xs">{producto.demora}</span>}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="flex h-7 w-7 items-center justify-center rounded-full border border-[rgb(var(--acento-rgb)/0.45)] text-sm disabled:opacity-40"
          onClick={() => setCantidad((c) => Math.max(1, c - 1))}
          disabled={cantidad <= 1}
          aria-label="Restar cantidad"
        >
          −
        </button>
        <span className="w-4 text-center">{cantidad}</span>
        <button
          type="button"
          className="flex h-7 w-7 items-center justify-center rounded-full border border-[rgb(var(--acento-rgb)/0.45)] text-sm"
          onClick={() => setCantidad((c) => c + 1)}
          aria-label="Sumar cantidad"
        >
          +
        </button>
      </div>
    </div>
    <p className="mt-2 text-right text-xs texto-suave">
      {cantidad} × {formatPrecio(unitario)}
    </p>
    <LineaEnvio envio={envio} />
    <div className="mt-3 flex items-center justify-between border-t border-[rgb(var(--acento-rgb)/0.22)] pt-4 font-semibold text-[var(--texto)]">
      <span>Total</span>
      <span>{formatPrecio(total + envio)}</span>
    </div>
    {ahorro > 0 && (
      <p className="mt-2 text-sm font-semibold text-[var(--destacado)]">Ahorrás {formatPrecio(ahorro)} con la promo</p>
    )}
    {proximo && (
      <button
        type="button"
        onClick={() => setCantidad(() => proximo.desde)}
        className="mt-2 text-left text-xs text-[var(--destacado)] underline underline-offset-2"
      >
        Llevando {cantidadConUnidad(proximo.desde, producto.unidad)} pagás {formatPrecio(proximo.precio)} {cadaUnoDe(producto.unidad)}
      </button>
    )}
    </>
  );
}

/** Resumen de la compra del carrito: una línea por producto y el total. */
function ResumenCarrito({
  lineas,
  total,
  envio,
}: {
  lineas: ReturnType<typeof lineasDelCarrito<ProductoCarrito>>["lineas"];
  total: number;
  envio: number;
}) {
  const ahorro = lineas.reduce((suma, l) => suma + l.ahorro, 0);
  return (
    <>
      <ul className="mt-4 space-y-3">
        {lineas.map((l) => (
          <li key={l.clave} className="flex items-start justify-between gap-3 text-sm texto-suave">
            <span>
              {l.producto.nombre}
              {l.elegidas.length > 0 && <span className="block text-xs text-[var(--texto)]">{textoOpciones(l.elegidas)}</span>}
              {l.producto.demora && <span className="block text-xs">{l.producto.demora}</span>}
              <span className="block text-xs">
                {cantidadConUnidad(l.cantidad, l.producto.unidad)} × {formatPrecio(l.unitario)}
              </span>
            </span>
            <span>{formatPrecio(l.total)}</span>
          </li>
        ))}
      </ul>
      <Link href="/carrito" className="mt-2 inline-block text-xs text-[var(--destacado)] underline underline-offset-2">
        Editar carrito
      </Link>
      <LineaEnvio envio={envio} />
      <div className="mt-3 flex items-center justify-between border-t border-[rgb(var(--acento-rgb)/0.22)] pt-4 font-semibold text-[var(--texto)]">
        <span>Total</span>
        <span>{formatPrecio(total + envio)}</span>
      </div>
      {ahorro > 0 && (
        <p className="mt-2 text-sm font-semibold text-[var(--destacado)]">Ahorrás {formatPrecio(ahorro)} con las promos</p>
      )}
    </>
  );
}

/** El envío en el resumen, cuando la zona tiene costo (a coordinar no suma nada). */
function LineaEnvio({ envio }: { envio: number }) {
  if (envio <= 0) return null;
  return (
    <div className="mt-2 flex items-center justify-between text-sm texto-suave">
      <span>Envío</span>
      <span>{formatPrecio(envio)}</span>
    </div>
  );
}
