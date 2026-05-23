"use client";

import { useState, useRef } from "react";
import { analizarStatement, type ResultadoAnalisis } from "@/lib/statementParser";

// pdf.js cargado desde CDN para no agregar dependencia de build.
// Corre 100% en el navegador: el PDF nunca se sube a ningún servidor.
const PDFJS_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.min.mjs";
const PDFJS_WORKER = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs";

interface Props {
  onResultado: (resumen: string) => void; // envía un resumen textual al cuestionario
}

export function StatementUploader({ onResultado }: Props) {
  const [estado, setEstado] = useState<"idle" | "procesando" | "listo" | "error">("idle");
  const [resultado, setResultado] = useState<ResultadoAnalisis | null>(null);
  const [mensaje, setMensaje] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function extraerTexto(file: File): Promise<string> {
    // Cargar pdf.js dinámicamente en el browser.
    const pdfjs = await import(/* webpackIgnore: true */ PDFJS_URL);
    pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
    const buffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: buffer }).promise;
    let texto = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      // Reconstruir líneas agrupando por posición vertical aproximada.
      const items = content.items as { str: string; transform: number[] }[];
      let lineaActual = "";
      let yPrev: number | null = null;
      for (const it of items) {
        const y = Math.round(it.transform[5]);
        if (yPrev !== null && Math.abs(y - yPrev) > 3) {
          texto += lineaActual + "\n";
          lineaActual = "";
        }
        lineaActual += it.str + " ";
        yPrev = y;
      }
      texto += lineaActual + "\n";
    }
    return texto;
  }

  async function manejarArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      setEstado("error");
      setMensaje("Por favor subí un archivo PDF.");
      return;
    }
    setEstado("procesando");
    setMensaje("");
    try {
      const texto = await extraerTexto(file);
      const res = analizarStatement(texto);
      setResultado(res);
      setEstado("listo");
    } catch (err) {
      console.error(err);
      setEstado("error");
      setMensaje("No pude leer el PDF en el navegador. Podés seguir respondiendo las preguntas a mano.");
    }
  }

  function confirmarYEnviar() {
    if (!resultado) return;
    const recientes = resultado.candidatosMepCcl.filter((c) => c.dentroDe90Dias);
    const caucionesArs = resultado.caucionesTomadoras.filter((c) => c.moneda === "ARS");
    const caucionesUsd = resultado.caucionesTomadoras.filter((c) => c.moneda === "USD");
    let resumen = "Analicé mi statement. ";
    if (recientes.length > 0) {
      resumen += `Detecté ${recientes.length} operación(es) que parecen MEP/CCL en los últimos 90 días: ` +
        recientes.map((c) => `${c.especie} ${c.tipoOperacion} el ${c.fecha}`).join("; ") + ". ";
    } else {
      resumen += "No detecté operaciones de MEP/CCL en los últimos 90 días. ";
    }
    if (caucionesArs.length > 0) {
      resumen += `Detecté ${caucionesArs.length} caución/pase tomador EN PESOS (moneda local). `;
    }
    if (caucionesUsd.length > 0) {
      resumen += `Detecté ${caucionesUsd.length} caución/pase tomador EN DÓLARES (USD) — aclaro que estas son en moneda extranjera. `;
    }
    if (resultado.caucionesTomadoras.length === 0) {
      resumen += "No detecté cauciones tomadoras. ";
    }
    resumen += "(Estos datos los detectó el análisis del statement; confirmo que son correctos. Recordá que la RG CNV 1062 solo inhabilita por cauciones tomadoras EN PESOS, no en dólares.)";
    onResultado(resumen);
  }

  return (
    <div
      style={{
        border: "1px dashed var(--line)",
        borderRadius: 4,
        padding: "16px 18px",
        marginBottom: 16,
        background: "var(--paper)",
      }}
    >
      <div style={{ fontSize: 14.5, marginBottom: 10 }}>
        <strong>Opcional:</strong> subí tu statement de comitente y lo analizo
        para detectar operaciones de MEP/CCL o cauciones.{" "}
        <span style={{ color: "var(--accent-soft)" }}>
          El archivo se procesa en tu navegador y no se sube a ningún servidor.
        </span>
      </div>

      {estado === "idle" && (
        <button
          onClick={() => inputRef.current?.click()}
          className="mono"
          style={{
            background: "transparent",
            border: "1.5px solid var(--accent)",
            color: "var(--accent)",
            borderRadius: 3,
            padding: "8px 16px",
            fontSize: 12,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          Subir statement (PDF)
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        onChange={manejarArchivo}
        style={{ display: "none" }}
      />

      {estado === "procesando" && (
        <div className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>
          Analizando en tu navegador…
        </div>
      )}

      {estado === "error" && (
        <div style={{ fontSize: 14, color: "var(--danger)" }}>{mensaje}</div>
      )}

      {estado === "listo" && resultado && (
        <div style={{ marginTop: 6 }}>
          {resultado.coreDetectado === "desconocido" ? (
            <div style={{ fontSize: 14, color: "var(--muted)" }}>
              No reconocí el formato de este statement. Seguí respondiendo las
              preguntas a mano.
            </div>
          ) : (
            <>
              <div style={{ fontSize: 13.5, marginBottom: 8 }}>
                Formato detectado:{" "}
                <span className="mono">{resultado.coreDetectado}</span> ·{" "}
                {resultado.totalOperaciones} operaciones leídas
              </div>

              {resultado.candidatosMepCcl.filter((c) => c.dentroDe90Dias).length > 0 ? (
                <div style={{ fontSize: 14, marginBottom: 8 }}>
                  <strong>Operaciones que parecen MEP/CCL en los últimos 90 días:</strong>
                  <ul style={{ margin: "6px 0", paddingLeft: 20 }}>
                    {resultado.candidatosMepCcl
                      .filter((c) => c.dentroDe90Dias)
                      .map((c, i) => (
                        <li key={i}>
                          {c.especie} — {c.tipoOperacion} — {c.fecha}
                        </li>
                      ))}
                  </ul>
                </div>
              ) : (
                <div style={{ fontSize: 14, marginBottom: 8 }}>
                  No detecté operaciones de MEP/CCL en los últimos 90 días.
                </div>
              )}

              {resultado.caucionesTomadoras.length > 0 && (
                <div style={{ fontSize: 14, marginBottom: 8 }}>
                  <strong>Cauciones tomadoras detectadas:</strong>{" "}
                  {resultado.caucionesTomadoras.filter((c) => c.moneda === "ARS").length} en pesos,{" "}
                  {resultado.caucionesTomadoras.filter((c) => c.moneda === "USD").length} en dólares.
                  <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 2 }}>
                    Solo las cauciones EN PESOS inhabilitan (RG CNV 1062); las de dólares no.
                  </div>
                </div>
              )}

              <div
                style={{
                  fontSize: 12.5,
                  color: "var(--muted)",
                  fontStyle: "italic",
                  marginBottom: 10,
                }}
              >
                Revisá que sea correcto. Esto es una ayuda de lectura, no un
                veredicto: vos confirmás.
              </div>

              <button
                onClick={confirmarYEnviar}
                className="mono"
                style={{
                  background: "var(--accent)",
                  color: "var(--paper)",
                  border: "none",
                  borderRadius: 3,
                  padding: "8px 18px",
                  fontSize: 12,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                Usar este resultado
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
