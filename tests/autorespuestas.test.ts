import { createHmac } from "crypto";
import { describe, expect, it } from "vitest";
import {
  armarTextoRespuesta,
  coincideTexto,
  elegirRegla,
  leerBotones,
  normalizarTexto,
  parsearPalabrasClave,
  type ReglaParaCoincidir,
} from "@/lib/instagram/reglas";
import { extraerEventos, firmaValida } from "@/lib/instagram/webhook";
import { textoConLinks } from "@/lib/instagram/mensajes";
import { autoRespuestaSchema } from "@/lib/validation";

describe("normalizarTexto", () => {
  it("pasa a minúsculas y saca tildes, signos y emojis", () => {
    expect(normalizarTexto("¡Hola! ¿Cuánto SALE la MIEL? 🍯🐝")).toBe("hola cuanto sale la miel");
    expect(normalizarTexto("  Información,   por favor... ")).toBe("informacion por favor");
    expect(normalizarTexto("Año")).toBe("ano");
  });
});

describe("parsearPalabrasClave", () => {
  it("separa por coma, normaliza y saca vacías y repetidas", () => {
    expect(parsearPalabrasClave("miel, Precio ,,info, MIEL")).toEqual(["miel", "precio", "info"]);
    expect(parsearPalabrasClave(["Envío", " "])).toEqual(["envio"]);
  });
});

describe("coincideTexto", () => {
  const claves = ["miel", "precio", "info", "quiero comprar"];

  it("coincide por palabra completa, sin importar tildes ni mayúsculas", () => {
    expect(coincideTexto("Hola! quería INFO", claves, "contiene")).toBe(true);
    expect(coincideTexto("¿precio?", claves, "contiene")).toBe(true);
    expect(coincideTexto("MIÉL", claves, "contiene")).toBe(true);
  });

  it("no coincide por pedazos de palabra", () => {
    expect(coincideTexto("es algo informal", claves, "contiene")).toBe(false);
    expect(coincideTexto("mieles", claves, "contiene")).toBe(false);
    expect(coincideTexto("preciosa foto", claves, "contiene")).toBe(false);
  });

  it("una clave de varias palabras tiene que aparecer seguida", () => {
    expect(coincideTexto("hola, quiero comprar dos", claves, "contiene")).toBe(true);
    expect(coincideTexto("quiero algo, no sé si comprar", claves, "contiene")).toBe(false);
  });

  it("en modo exacta el mensaje entero tiene que ser la clave", () => {
    expect(coincideTexto("Precio!", claves, "exacta")).toBe(true);
    expect(coincideTexto("el precio", claves, "exacta")).toBe(false);
  });

  it("un mensaje vacío o solo con emojis no coincide", () => {
    expect(coincideTexto("🐝🐝", claves, "contiene")).toBe(false);
    expect(coincideTexto("", claves, "exacta")).toBe(false);
  });
});

describe("elegirRegla", () => {
  const base = { coincidencia: "contiene" as const, activa: true };
  const reglas: ReglaParaCoincidir[] = [
    { ...base, id: 1, palabrasClave: ["miel", "precio"], canal: "ambos", prioridad: 10 },
    { ...base, id: 2, palabrasClave: ["precio"], canal: "dm", prioridad: 20 },
    { ...base, id: 3, palabrasClave: ["envio"], canal: "comentario", prioridad: 5 },
    { ...base, id: 4, palabrasClave: ["precio"], canal: "ambos", prioridad: 50, activa: false },
    { ...base, id: 5, palabrasClave: ["miel"], canal: "ambos", prioridad: 10 },
  ];

  it("gana la de mayor prioridad entre las activas del canal", () => {
    expect(elegirRegla("precio?", "dm", reglas)?.id).toBe(2);
    expect(elegirRegla("precio?", "comentario", reglas)?.id).toBe(1);
  });

  it("respeta el canal", () => {
    expect(elegirRegla("hacen envío?", "comentario", reglas)?.id).toBe(3);
    expect(elegirRegla("hacen envío?", "dm", reglas)).toBeNull();
  });

  it("a igual prioridad gana la más vieja", () => {
    expect(elegirRegla("miel", "dm", reglas)?.id).toBe(1);
  });

  it("sin coincidencia devuelve null", () => {
    expect(elegirRegla("hola, qué lindo", "dm", reglas)).toBeNull();
  });
});

describe("armado de la respuesta", () => {
  const datos = (cambios = {}) => ({
    nombre: "Miel", precio: "$ 6.500", promos: "", catalogo: "Miel ($ 6.500) y Vela ($ 2.000)",
    zonas: "CABA (a coordinar después de la compra)", ...cambios,
  });

  it("reemplaza $PROMOS por las promos por cantidad", () => {
    expect(armarTextoRespuesta("Frasco a $PRECIO. Promos: $PROMOS", datos({ promos: "5 frascos a $ 30.000" }))).toBe("Frasco a $ 6.500. Promos: 5 frascos a $ 30.000");
    expect(armarTextoRespuesta("Promos: $PROMOS", datos())).toBe("Promos: ");
  });

  it("reemplaza $PRECIO", () => {
    expect(armarTextoRespuesta("Frasco a $PRECIO. Dos a 2x$PRECIO", datos())).toBe("Frasco a $ 6.500. Dos a 2x$ 6.500");
  });

  it("reemplaza $PRODUCTO, $CATALOGO y $ZONAS", () => {
    expect(armarTextoRespuesta("$PRODUCTO. Tenemos $CATALOGO. Enviamos a $ZONAS.", datos())).toBe(
      "Miel. Tenemos Miel ($ 6.500) y Vela ($ 2.000). Enviamos a CABA (a coordinar después de la compra)."
    );
  });

  it("no vuelve a reemplazar lo que ya se reemplazó", () => {
    expect(armarTextoRespuesta("$PRODUCTO", datos({ nombre: "Promo $PRECIO" }))).toBe("Promo $PRECIO");
  });

  it("lee los botones guardados sin confiar en su forma", () => {
    expect(leerBotones([{ titulo: "A", url: "https://a.com" }, { titulo: 1 }, null, "x"])).toEqual([
      { titulo: "A", url: "https://a.com" },
    ]);
    expect(leerBotones({})).toEqual([]);
  });

  it("arma el texto con links cuando no se pueden usar botones", () => {
    expect(textoConLinks("Hola", [{ titulo: "Comprar", url: "https://x.com" }])).toBe("Hola\n\nComprar: https://x.com");
    expect(textoConLinks("Hola", [])).toBe("Hola");
  });
});

describe("firmaValida", () => {
  const secreto = "secreto-de-la-app";
  const body = JSON.stringify({ object: "instagram", entry: [] });
  const firma = (b: string, s = secreto) => `sha256=${createHmac("sha256", s).update(b).digest("hex")}`;

  it("acepta la firma correcta", () => {
    expect(firmaValida(body, firma(body), secreto)).toBe(true);
  });

  it("rechaza firmas incorrectas, mal formadas o sin secreto", () => {
    expect(firmaValida(body, firma(body, "otro"), secreto)).toBe(false);
    expect(firmaValida(`${body} `, firma(body), secreto)).toBe(false);
    expect(firmaValida(body, firma(body).replace("sha256=", "sha1="), secreto)).toBe(false);
    expect(firmaValida(body, "sha256=abc", secreto)).toBe(false);
    expect(firmaValida(body, null, secreto)).toBe(false);
    expect(firmaValida(body, firma(body), undefined)).toBe(false);
  });
});

describe("extraerEventos", () => {
  const CUENTA = "17840000000000001";

  it("toma DMs de texto e ignora ecos, lecturas, reacciones y adjuntos", () => {
    const eventos = extraerEventos({
      object: "instagram",
      entry: [
        {
          id: CUENTA,
          messaging: [
            { sender: { id: "u1" }, recipient: { id: CUENTA }, message: { mid: "m1", text: "precio?" } },
            { sender: { id: CUENTA }, recipient: { id: "u1" }, message: { mid: "m2", text: "hola", is_echo: true } },
            { sender: { id: "u1" }, recipient: { id: CUENTA }, read: { mid: "m1" } },
            { sender: { id: "u1" }, recipient: { id: CUENTA }, reaction: { mid: "m1", action: "react" } },
            { sender: { id: "u1" }, recipient: { id: CUENTA }, message: { mid: "m3", attachments: [{ type: "image" }] } },
            { sender: { id: "u1" }, recipient: { id: CUENTA }, message: { mid: "m4", text: "x", is_deleted: true } },
          ],
        },
      ],
    });
    expect(eventos).toEqual([{ tipo: "dm", externalId: "m1", usuarioIgId: "u1", texto: "precio?" }]);
  });

  it("toma comentarios de otros y no los propios", () => {
    const eventos = extraerEventos({
      object: "instagram",
      entry: [
        {
          id: CUENTA,
          changes: [
            { field: "comments", value: { id: "c1", text: "info!", from: { id: "u2", username: "ana" }, media: { id: "p1" } } },
            { field: "comments", value: { id: "c2", text: "¡Te mandamos un DM!", from: { id: CUENTA } } },
            { field: "mentions", value: { media_id: "p2" } },
          ],
        },
      ],
    });
    expect(eventos).toEqual([{ tipo: "comentario", externalId: "c1", usuarioIgId: "u2", texto: "info!" }]);
  });

  it("acepta el formato de prueba del panel de Meta (changes con field messages)", () => {
    const eventos = extraerEventos({
      object: "instagram",
      entry: [{ id: CUENTA, changes: [{ field: "messages", value: { sender: { id: "u3" }, message: { mid: "m9", text: "miel" } } }] }],
    });
    expect(eventos).toEqual([{ tipo: "dm", externalId: "m9", usuarioIgId: "u3", texto: "miel" }]);
  });

  it("ignora payloads que no son de Instagram o están rotos", () => {
    expect(extraerEventos(null)).toEqual([]);
    expect(extraerEventos({ object: "page", entry: [] })).toEqual([]);
    expect(extraerEventos({ object: "instagram", entry: [null, { messaging: [null] }] })).toEqual([]);
  });
});

describe("autoRespuestaSchema", () => {
  const valida = {
    nombre: "Bienvenida",
    palabrasClave: ["Miel", " precio ", ""],
    coincidencia: "contiene",
    canal: "ambos",
    respuesta: "Hola! Frasco a $PRECIO",
    botones: [
      { titulo: "🍯 Quiero comprar", url: "https://melera.vercel.app/producto?origen=instagram" },
      { titulo: "💬 Tengo una consulta", url: "https://melera.vercel.app/consultas?origen=instagram" },
    ],
    respuestaPublicaComentario: "",
    prioridad: "10",
    activa: true,
  };

  it("acepta la regla de ManyChat y normaliza", () => {
    const r = autoRespuestaSchema.parse(valida);
    expect(r.palabrasClave).toEqual(["miel", "precio"]);
    expect(r.prioridad).toBe(10);
    expect(r.respuestaPublicaComentario).toBeNull();
  });

  it("rechaza botones con títulos largos, URLs inválidas o no https, y más de 3", () => {
    const con = (botones: unknown) => autoRespuestaSchema.safeParse({ ...valida, botones }).success;
    expect(con([{ titulo: "Un título demasiado largo", url: "https://a.com" }])).toBe(false);
    expect(con([{ titulo: "Ok", url: "no es url" }])).toBe(false);
    expect(con([{ titulo: "Ok", url: "http://a.com" }])).toBe(false);
    expect(con([{ titulo: "Ok", url: "javascript:alert(1)" }])).toBe(false);
    expect(con(Array(4).fill({ titulo: "Ok", url: "https://a.com" }))).toBe(false);
  });

  it("pide al menos una palabra clave", () => {
    expect(autoRespuestaSchema.safeParse({ ...valida, palabrasClave: [" ", ","] }).success).toBe(false);
  });
});
