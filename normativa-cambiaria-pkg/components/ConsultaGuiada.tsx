"use client";

import { useState, useRef, useEffect } from "react";
import { Markdown } from "@/components/Markdown";
import { StatementUploader } from "@/components/StatementUploader";

interface Turno {
  role: "user" | "assistant";
  content: string;
}

interface RespuestaMotor {
  accion: "preguntar" | "concluir";
  mensaje: string;
  opciones?: string[];
  inhabilitantes_chequeados?: string[];
  progreso?: string;
}

const SALUDO_INICIAL =
  "Te voy a hacer algunas preguntas para determinar si podés acceder al mercado de cambios. Empecemos: ¿estás consultando como **persona humana** o por una **empresa / persona jurídica**?";

export function ConsultaGuiada() {
  const [turnos, setTurnos] = useState<Turno[]>([
    { role: "assistant", content: SALUDO_INICIAL },
  ]);
  const [input, setInput] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [progreso, setProgreso] = useState("");
  const [opciones, setOpciones] = useState<string[]>([
    "Persona humana",
    "Persona jurídica",
  ]);
  const [concluido, setConcluido] = useState(false);
  const finRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turnos, cargando]);

  async function enviar(textoBoton?: string) {
    const texto = (textoBoton ?? input).trim();
    if (texto.length < 1 || cargando || concluido) return;

    const nuevos: Turno[] = [...turnos, { role: "user", content: texto }];
    setTurnos(nuevos);
    setInput("");
    setOpciones([]); // limpiar botones al responder
    setCargando(true);
    setError("");

    try {
      const res = await fetch("/api/cuestionario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ historial: nuevos }),
      });
      const data: RespuestaMotor & { error?: string } = await res.json();
      if (!res.ok) {
        setError(data.error || "Ocurrió un error.");
      } else {
        setTurnos([...nuevos, { role: "assistant", content: data.mensaje }]);
        setProgreso(data.progreso || "");
        setOpciones(Array.isArray(data.opciones) ? data.opciones : []);
        if (data.accion === "concluir") setConcluido(true);
      }
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setCargando(false);
    }
  }

  function reiniciar() {
    setTurnos([{ role: "assistant", content: SALUDO_INICIAL }]);
    setInput("");
    setError("");
    setProgreso("");
    setOpciones(["Persona humana", "Persona jurídica"]);
    setConcluido(false);
  }

  return (
    <div>
      {/* Barra de progreso textual */}
      {progreso && !concluido && (
        <div
          className="mono"
          style={{
            fontSize: 11,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--accent)",
            marginBottom: 16,
          }}
        >
          ● {progreso}
        </div>
      )}

      {/* Hilo de conversación */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
          marginBottom: 24,
        }}
      >
        {turnos.map((t, i) => (
          <div
            key={i}
            style={{
              alignSelf: t.role === "user" ? "flex-end" : "flex-start",
              maxWidth: t.role === "user" ? "75%" : "100%",
              width: t.role === "assistant" ? "100%" : "auto",
            }}
          >
            {t.role === "user" ? (
              <div
                style={{
                  background: "var(--accent)",
                  color: "var(--paper)",
                  padding: "10px 16px",
                  borderRadius: "12px 12px 2px 12px",
                  fontSize: 16,
                }}
              >
                {t.content}
              </div>
            ) : (
              <div
                style={{
                  background: "var(--paper-2)",
                  border: "1px solid var(--line)",
                  borderLeft: concluido && i === turnos.length - 1 ? "4px solid var(--accent)" : "1px solid var(--line)",
                  padding: "16px 20px",
                  borderRadius: 4,
                  fontSize: 16.5,
                  lineHeight: 1.65,
                }}
              >
                <Markdown texto={t.content} />
              </div>
            )}
          </div>
        ))}
        {cargando && (
          <div
            className="mono"
            style={{ color: "var(--muted)", fontSize: 13, alignSelf: "flex-start" }}
          >
            Analizando…
          </div>
        )}
        <div ref={finRef} />
      </div>

      {error && (
        <div
          style={{
            padding: "12px 16px",
            background: "#f7e4e0",
            border: "1px solid #d9a99f",
            borderRadius: 3,
            color: "var(--danger)",
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      {/* Uploader de statement (opcional, client-side) */}
      {!concluido && !cargando && (
        <StatementUploader onResultado={(resumen) => enviar(resumen)} />
      )}

      {/* Botones de opciones (cuando el motor las ofrece) */}
      {!concluido && !cargando && opciones.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            marginBottom: 16,
          }}
        >
          {opciones.map((op) => (
            <button
              key={op}
              onClick={() => enviar(op)}
              style={{
                background: "var(--paper)",
                border: "1.5px solid var(--accent)",
                borderRadius: 20,
                padding: "9px 18px",
                fontFamily: "Newsreader, serif",
                fontSize: 15.5,
                color: "var(--accent)",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--accent)";
                e.currentTarget.style.color = "var(--paper)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--paper)";
                e.currentTarget.style.color = "var(--accent)";
              }}
            >
              {op}
            </button>
          ))}
        </div>
      )}

      {/* Input o botón de reinicio */}
      {concluido ? (
        <button
          onClick={reiniciar}
          className="mono"
          style={{
            background: "var(--accent)",
            color: "var(--paper)",
            border: "none",
            borderRadius: 3,
            padding: "12px 28px",
            fontSize: 13,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          Nueva consulta
        </button>
      ) : (
        <div style={{ display: "flex", gap: 10 }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                enviar();
              }
            }}
            placeholder={
              opciones.length > 0
                ? "Tocá una opción o escribí tu respuesta…"
                : "Tu respuesta…"
            }
            disabled={cargando}
            style={{
              flex: 1,
              background: "var(--paper)",
              border: "1px solid var(--line)",
              borderRadius: 3,
              padding: "12px 16px",
              fontFamily: "Newsreader, serif",
              fontSize: 16,
              color: "var(--ink)",
              outline: "none",
            }}
          />
          <button
            onClick={() => enviar()}
            disabled={cargando || input.trim().length < 1}
            className="mono"
            style={{
              background:
                cargando || input.trim().length < 1 ? "var(--muted)" : "var(--accent)",
              color: "var(--paper)",
              border: "none",
              borderRadius: 3,
              padding: "12px 24px",
              fontSize: 13,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              cursor:
                cargando || input.trim().length < 1 ? "not-allowed" : "pointer",
            }}
          >
            Enviar
          </button>
        </div>
      )}
    </div>
  );
}
