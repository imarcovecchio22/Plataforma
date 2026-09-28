import type { Metadata } from "next";
import Link from "next/link";
import { cliente } from "@/plataforma/cliente";

export const metadata: Metadata = {
  title: `Política de privacidad | ${cliente.nombre}`,
  description: `Qué datos recibe ${cliente.nombre} cuando nos escribís por Instagram o compras en la web, para qué los usamos y cómo pedir que los borremos.`,
};

// TODO: agregar un email de contacto del cliente (por ahora se piden las bajas por /consultas o por DM).
const ACTUALIZADA = "25 de septiembre de 2026";

export default function PrivacidadPage() {
  return (
    <>
      <main className="contenedor-panal flex-1 py-10 sm:py-16">
        <article className="tarjeta-panal mx-auto max-w-2xl space-y-6 p-6 leading-relaxed texto-suave sm:p-10">
          <div>
            <h1 className="titulo-panal">Política de privacidad</h1>
            <p className="mt-2 text-sm texto-suave">Última actualización: {ACTUALIZADA}</p>
          </div>

          <p>
            {cliente.nombre} ({cliente.textos.privacidad.quienes}) cuida los datos de las personas que nos escriben y nos
            compran. Esta página explica qué datos recibimos, para qué los usamos y cómo pedir que los borremos.
          </p>

          <section className="space-y-2">
            <h2 className="font-serif text-xl font-semibold text-[var(--ink)]">Qué datos recibimos de Instagram</h2>
            <p>
              Cuando le mandás un mensaje directo a <strong>@{cliente.instagram}</strong> o comentás una de nuestras
              publicaciones, Instagram (Meta) nos envía el texto del mensaje o del comentario y un identificador de tu
              cuenta que asigna Instagram. No recibimos tu contraseña, tus contactos ni otros datos de tu cuenta.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-serif text-xl font-semibold text-[var(--ink)]">Para qué los usamos</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                Para responderte automáticamente con {cliente.textos.privacidad.infoRespuestas}, el precio y los links para
                comprar o consultar.
              </li>
              <li>Para no mandarte la misma respuesta repetida y para revisar que las respuestas funcionen bien.</li>
              <li>
                Si comprás o nos dejás una consulta en la web, usamos los datos que cargás (nombre, contacto y dirección
                de envío) solo para gestionar tu pedido o responderte. Los pagos los procesa Mercado Pago: nosotros no
                vemos ni guardamos los datos de tu tarjeta.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="font-serif text-xl font-semibold text-[var(--ink)]">Lo que no hacemos</h2>
            <p>
              No vendemos, alquilamos ni compartimos tus datos con terceros para publicidad. Solo los usan los servicios
              que necesitamos para funcionar (Instagram/Meta para los mensajes, Mercado Pago para los pagos y nuestro
              proveedor de hosting y base de datos).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-serif text-xl font-semibold text-[var(--ink)]">Cuánto tiempo los guardamos</h2>
            <p>
              Los mensajes recibidos por Instagram se guardan solo el tiempo necesario para responder y revisar el
              funcionamiento. Los datos de pedidos se guardan mientras haga falta para el envío y por obligaciones
              legales.
            </p>
          </section>

          <section id="borrar-datos" className="space-y-2 scroll-mt-20">
            <h2 className="font-serif text-xl font-semibold text-[var(--ink)]">Cómo pedir que borremos tus datos</h2>
            <p>
              Podés pedir que borremos tus datos cuando quieras, sin costo: mandanos un mensaje directo a{" "}
              <a href={`https://instagram.com/${cliente.instagram}`} className="font-semibold text-[var(--glow)] underline underline-offset-4" target="_blank" rel="noopener noreferrer">
                @{cliente.instagram}
              </a>{" "}
              o escribinos desde{" "}
              <Link href="/consultas" className="font-semibold text-[var(--glow)] underline underline-offset-4">
                la página de consultas
              </Link>{" "}
              diciendo &quot;borrar mis datos&quot;. Los eliminamos dentro de los 30 días y te avisamos cuando esté hecho.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-serif text-xl font-semibold text-[var(--ink)]">Cambios</h2>
            <p>Si cambiamos esta política, vas a ver la nueva versión en esta misma página con la fecha actualizada.</p>
          </section>
        </article>
      </main>
    </>
  );
}
