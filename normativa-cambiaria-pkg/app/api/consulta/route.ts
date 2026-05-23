import { NextRequest, NextResponse } from "next/server";
import { recuperar } from "@/lib/retrieval";
import { construirSystemPrompt, construirUserMessage } from "@/lib/prompt";

export const runtime = "nodejs";
export const maxDuration = 30;

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-opus-4-7";

export async function POST(req: NextRequest) {
  try {
    const { pregunta } = await req.json();

    if (!pregunta || typeof pregunta !== "string" || pregunta.trim().length < 3) {
      return NextResponse.json(
        { error: "Ingresá una consulta válida." },
        { status: 400 }
      );
    }
    if (pregunta.length > 2000) {
      return NextResponse.json(
        { error: "La consulta es demasiado larga (máx. 2000 caracteres)." },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "El servidor no tiene configurada la API key (ANTHROPIC_API_KEY)." },
        { status: 500 }
      );
    }

    // 1. Recuperar fragmentos relevantes del corpus.
    const fragmentos = recuperar(pregunta, 4);

    // 2. Construir prompt con reglas estrictas de RAG.
    const system = construirSystemPrompt();
    const userMessage = construirUserMessage(pregunta, fragmentos);

    // 3. Llamar a Anthropic con la key protegida server-side.
    const resp = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1500,
        system,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!resp.ok) {
      const detalle = await resp.text();
      console.error("Anthropic API error:", resp.status, detalle);
      return NextResponse.json(
        { error: "Error al consultar el motor de IA. Intentá de nuevo." },
        { status: 502 }
      );
    }

    const data = await resp.json();
    const respuesta = (data.content || [])
      .filter((b: { type: string }) => b.type === "text")
      .map((b: { text: string }) => b.text)
      .join("\n")
      .trim();

    // 4. Devolver respuesta + las fuentes citables para mostrar al usuario.
    return NextResponse.json({
      respuesta,
      fuentes: fragmentos.map((f) => ({
        id: f.id,
        organismo: f.organismo,
        cuerpo: f.cuerpo,
        seccion: f.seccion,
        punto: f.punto,
        comunicacion: f.comunicacion_origen,
        estado: f.estado,
        vigencia_desde: f.vigencia_desde ?? null,
        url: f.fuente_url,
        score: Math.round(f.score * 100) / 100,
      })),
    });
  } catch (err) {
    console.error("Error en /api/consulta:", err);
    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500 }
    );
  }
}
