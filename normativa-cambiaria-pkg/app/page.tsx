"use client";

import { useState } from "react";

interface Fuente {
  id: string;
  organismo: string;
  cuerpo: string;
  seccion: string;
  punto: string;
  comunicacion: string;
  estado: string;
  vigencia_desde: string | null;
  url: string;
  score: number;
}

const EJEMPLOS = [
  "¿Una persona humana puede comprar dólares para atesoramiento sin límite?",
  "¿Cuánto puede girar al exterior por ayuda familiar?",
  "¿Una S.A. puede formar activos externos sin autorización del BCRA?",
  "¿Sigue vigente la percepción del 30% al comprar dólares?",
  "Soy freelance y exporto servicios, ¿tengo que liquidar las divisas?",
];

const ORG_COLOR: Record<string, string> = {
  BCRA: "#1a4d3a",
  CNV: "#3a4d7a",
  ARCA: "#7a3a4d",
  AFIP: "#7a3a4d",
};

export default function Home() {
  const [pregunta, setPregunta] = useState("");
  const [respuesta, setRespuesta] = useState("");
  const [fuentes, setFuentes] = useState<Fuente[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  async function consultar(q?: string) {
    const texto = (q ?? pregunta).trim();
    if (texto.length < 3 || cargando) return;
    if (q) setPregunta(q);

    setCargando(true);
    setError("");
    setRespuesta("");
    setFuentes([]);

    try {
      const res = await fetch("/api/consulta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pregunta: texto }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Ocurrió un error.");
      } else {
        setRespuesta(data.respuesta);
        setFuentes(data.fuentes || []);
      }
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <main style={{ maxWidth: 1080, margin: "0 auto", padding: "0 24px 120px" }}>
      {/* Encabezado */}
      <header
        style={{
          borderBottom: "2px solid var(--ink)",
          paddingTop: 56,
          paddingBottom: 22,
          marginBottom: 8,
        }}
      >
        <div
          className="mono"
          style={{
            fontSize: 12,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--accent)",
            marginBottom: 14,
          }}
        >
          República Argentina · BCRA · CNV · ARCA
        </div>
        <h1
          className="display"
          style={{
            fontSize: "clamp(38px, 6vw, 64px)",
            lineHeight: 1.02,
            fontWeight: 600,
            letterSpacing: "-0.02em",
            maxWidth: 820,
          }}
        >
          Régimen Cambiario
        </h1>
        <p
          style={{
            fontSize: 19,
            color: "var(--muted)",
            marginTop: 12,
            maxWidth: 640,
            fontStyle: "italic",
          }}
        >
          Consultá la normativa vigente sobre compra de divisas, giros y
          transferencias al exterior. Cada respuesta cita la norma que la
          sustenta.
        </p>
      </header>

      <div
        className="mono"
        style={{
          fontSize: 11.5,
          color: "var(--muted)",
          marginBottom: 40,
          letterSpacing: "0.04em",
        }}
      >
        Corpus actualizado al 19/09/2025 · régimen post-reforma abril 2025
      </div>

      {/* Caja de consulta */}
      <section
        style={{
          background: "var(--paper-2)",
          border: "1px solid var(--line)",
          borderRadius: 4,
          padding: 24,
          boxShadow: "4px 4px 0 rgba(22,20,15,0.08)",
        }}
      >
        <textarea
          value={pregunta}
          onChange={(e) => setPregunta(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) consultar();
          }}
          placeholder="Escribí tu consulta… ej: ¿puedo transferir dólares a una cuenta en el exterior?"
          rows={3}
          style={{
            width: "100%",
            background: "var(--paper)",
            border: "1px solid var(--line)",
            borderRadius: 3,
            padding: "14px 16px",
            fontFamily: "Newsreader, serif",
            fontSize: 17,
            color: "var(--ink)",
            resize: "vertical",
            outline: "none",
          }}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 14,
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
            ⌘/Ctrl + Enter para consultar
          </span>
          <button
            onClick={() => consultar()}
            disabled={cargando || pregunta.trim().length < 3}
            className="mono"
            style={{
              background: cargando ? "var(--muted)" : "var(--accent)",
              color: "var(--paper)",
              border: "none",
              borderRadius: 3,
              padding: "12px 28px",
              fontSize: 13,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              cursor:
                cargando || pregunta.trim().length < 3
                  ? "not-allowed"
                  : "pointer",
              transition: "background 0.15s",
            }}
          >
            {cargando ? "Consultando…" : "Consultar"}
          </button>
        </div>
      </section>

      {/* Ejemplos */}
      {!respuesta && !cargando && !error && (
        <section style={{ marginTop: 32 }}>
          <div
            className="mono"
            style={{
              fontSize: 11,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--muted)",
              marginBottom: 14,
            }}
          >
            Consultas frecuentes
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {EJEMPLOS.map((ej) => (
              <button
                key={ej}
                onClick={() => consultar(ej)}
                style={{
                  textAlign: "left",
                  background: "transparent",
                  border: "1px solid var(--line)",
                  borderRadius: 3,
                  padding: "12px 16px",
                  fontFamily: "Newsreader, serif",
                  fontSize: 16,
                  color: "var(--ink)",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--accent)";
                  e.currentTarget.style.background = "var(--paper-2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--line)";
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <span style={{ color: "var(--accent)", marginRight: 8 }}>→</span>
                {ej}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Error */}
      {error && (
        <div
          style={{
            marginTop: 28,
            padding: "16px 20px",
            background: "#f7e4e0",
            border: "1px solid #d9a99f",
            borderRadius: 3,
            color: "var(--danger)",
          }}
        >
          {error}
        </div>
      )}

      {/* Cargando */}
      {cargando && (
        <div
          className="mono"
          style={{
            marginTop: 40,
            color: "var(--muted)",
            fontSize: 13,
            letterSpacing: "0.05em",
          }}
        >
          Recuperando normativa vigente y analizando…
        </div>
      )}

      {/* Respuesta */}
      {respuesta && (
        <section
          style={{
            marginTop: 40,
            display: "grid",
            gridTemplateColumns: "minmax(0,1fr)",
            gap: 28,
          }}
        >
          <article
            style={{
              background: "var(--paper)",
              border: "1px solid var(--line)",
              borderLeft: "4px solid var(--accent)",
              borderRadius: 3,
              padding: "28px 32px",
            }}
          >
            <div
              className="mono"
              style={{
                fontSize: 11,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--accent)",
                marginBottom: 18,
              }}
            >
              Respuesta
            </div>
            <div
              style={{
                whiteSpace: "pre-wrap",
                fontSize: 17.5,
                lineHeight: 1.7,
              }}
            >
              {respuesta}
            </div>
          </article>

          {/* Fuentes */}
          {fuentes.length > 0 && (
            <div>
              <div
                className="mono"
                style={{
                  fontSize: 11,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--muted)",
                  marginBottom: 14,
                }}
              >
                Fuentes consultadas ({fuentes.length})
              </div>
              <div style={{ display: "grid", gap: 10 }}>
                {fuentes.map((f) => (
                  <a
                    key={f.id}
                    href={f.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "block",
                      textDecoration: "none",
                      color: "var(--ink)",
                      background: "var(--paper-2)",
                      border: "1px solid var(--line)",
                      borderRadius: 3,
                      padding: "14px 16px",
                      transition: "border-color 0.15s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.borderColor = "var(--accent)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.borderColor = "var(--line)")
                    }
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 6,
                      }}
                    >
                      <span
                        className="mono"
                        style={{
                          fontSize: 10,
                          fontWeight: 500,
                          letterSpacing: "0.05em",
                          color: "#fff",
                          background: ORG_COLOR[f.organismo] || "#555",
                          padding: "2px 7px",
                          borderRadius: 2,
                        }}
                      >
                        {f.organismo}
                      </span>
                      <span
                        className="mono"
                        style={{
                          fontSize: 10.5,
                          color:
                            f.estado === "vigente"
                              ? "var(--accent-soft)"
                              : "var(--danger)",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        ● {f.estado}
                      </span>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 500 }}>
                      {f.cuerpo}
                    </div>
                    <div
                      className="mono"
                      style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 3 }}
                    >
                      {f.seccion} · punto {f.punto} · {f.comunicacion}
                      {f.vigencia_desde ? ` · desde ${f.vigencia_desde}` : ""}
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Disclaimer permanente al pie */}
      <footer
        style={{
          marginTop: 80,
          paddingTop: 24,
          borderTop: "1px solid var(--line)",
        }}
      >
        <div
          style={{
            background: "var(--alert-bg)",
            border: "1px solid var(--alert-line)",
            borderRadius: 3,
            padding: "16px 20px",
            fontSize: 14.5,
            lineHeight: 1.55,
          }}
        >
          <strong>Aviso.</strong> Esta herramienta brinda información de
          carácter general y <strong>no constituye asesoramiento</strong> legal,
          contable ni cambiario, ni opinión vinculante. La normativa cambiaria
          argentina se modifica con frecuencia y una respuesta puede quedar
          desactualizada. Verificá siempre contra la fuente oficial (BCRA, CNV,
          ARCA) y consultá a un profesional antes de realizar cualquier
          operación.
        </div>
        <div
          className="mono"
          style={{
            fontSize: 11,
            color: "var(--muted)",
            marginTop: 16,
            textAlign: "center",
            letterSpacing: "0.04em",
          }}
        >
          Fuente primaria: Texto Ordenado de Exterior y Cambios — bcra.gob.ar
        </div>
      </footer>
    </main>
  );
}
