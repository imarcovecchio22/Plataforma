"use client";

import { useEffect, useRef, useState } from "react";
import { cliente, hostCliente } from "@/plataforma/cliente";

type ChatMessage = { role: "user" | "assistant"; content: string };

const WELCOME: ChatMessage = {
  role: "assistant",
  content: `¡Hola! ${cliente.textos.emoji} Soy el asistente de ${cliente.nombre}. ¿En qué te puedo ayudar?`,
};

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, loading]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const history = [...messages, { role: "user" as const, content: text }];
    setMessages(history);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });

      if (!res.body) throw new Error("Sin respuesta");

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
      setLoading(false);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = {
            role: "assistant",
            content: next[next.length - 1].content + chunk,
          };
          return next;
        });
      }
    } catch {
      setLoading(false);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            `Uy, no pudimos conectar con el asistente. Probá de nuevo en un rato o escribinos desde ${hostCliente}/consultas.`,
        },
      ]);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {open && (
        <div className="flex h-[70vh] max-h-[560px] w-[92vw] max-w-sm flex-col overflow-hidden rounded-2xl border border-marca-100 bg-white shadow-soft">
          <div className="flex items-center justify-between bg-marca-700 px-4 py-3">
            <p className="font-serif text-lg font-semibold text-claro">{cliente.textos.tituloChat}</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Cerrar chat"
              className="rounded-full p-1 text-claro/80 transition hover:bg-white/10 hover:text-claro"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto bg-claro px-3 py-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "rounded-br-sm bg-marca-600 text-claro"
                      : "rounded-bl-sm border border-marca-100 bg-white text-oscuro"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-marca-100 bg-white px-4 py-3">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-marca-500 [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-marca-500 [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-marca-500" />
                </div>
              </div>
            )}
          </div>

          <form onSubmit={sendMessage} className="flex items-center gap-2 border-t border-marca-100 bg-white p-2.5">
            <input
              id="chat-widget-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribí tu consulta..."
              className="min-w-0 flex-1 rounded-full border border-stone-300 bg-white px-4 py-2 text-sm text-stone-800 outline-none transition focus:border-marca-400 focus:ring-2 focus:ring-marca-200"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              aria-label="Enviar mensaje"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-marca-600 text-claro transition hover:bg-marca-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M2.5 10L17.5 2.5L12.5 17.5L9.5 11L2.5 10Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
              </svg>
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Cerrar chat" : "Abrir chat"}
        data-fondo-evita
        className="flex h-14 w-14 items-center justify-center rounded-full bg-marca-600 text-2xl text-claro shadow-soft transition hover:bg-marca-700"
      >
        {open ? "✕" : cliente.textos.emoji}
      </button>
    </div>
  );
}
