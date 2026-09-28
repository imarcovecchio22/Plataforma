import { partesRespuesta } from "@/lib/preguntas";

/** Respuesta de una pregunta frecuente ya armada (ver src/lib/preguntas.ts), con sus links. */
export default function RespuestaFrecuente({ texto, claseLink }: { texto: string; claseLink: string }) {
  return (
    <>
      {partesRespuesta(texto).map((parte, i) =>
        "href" in parte ? (
          <a
            key={i}
            href={parte.href}
            className={claseLink}
            {...(parte.href.startsWith("https://") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          >
            {parte.texto}
          </a>
        ) : (
          parte.texto
        )
      )}
    </>
  );
}
