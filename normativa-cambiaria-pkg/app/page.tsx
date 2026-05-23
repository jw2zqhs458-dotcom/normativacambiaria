"use client";

import { useState } from "react";
import { ConsultaLibre } from "@/components/ConsultaLibre";
import { ConsultaGuiada } from "@/components/ConsultaGuiada";

type Modo = "libre" | "guiada";

export default function Home() {
  const [modo, setModo] = useState<Modo>("libre");

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

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 4,
          marginTop: 28,
          marginBottom: 36,
          borderBottom: "1px solid var(--line)",
        }}
      >
        {([
          ["libre", "Consulta libre"],
          ["guiada", "Consulta guiada"],
        ] as [Modo, string][]).map(([m, label]) => (
          <button
            key={m}
            onClick={() => setModo(m)}
            className="mono"
            style={{
              background: "transparent",
              border: "none",
              borderBottom:
                modo === m ? "2px solid var(--accent)" : "2px solid transparent",
              padding: "10px 18px",
              marginBottom: -1,
              fontSize: 12.5,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: modo === m ? "var(--accent)" : "var(--muted)",
              cursor: "pointer",
              fontWeight: modo === m ? 600 : 400,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Descripción del modo */}
      <div
        style={{
          fontSize: 15,
          color: "var(--muted)",
          marginBottom: 28,
          fontStyle: "italic",
        }}
      >
        {modo === "libre"
          ? "Hacé una pregunta puntual y obtené la respuesta con su cita normativa."
          : "Te hago preguntas paso a paso para detectar qué puede inhabilitarte antes de concluir. Pensado para personas humanas."}
      </div>

      {modo === "libre" ? <ConsultaLibre /> : <ConsultaGuiada />}

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
      </footer>
    </main>
  );
}
