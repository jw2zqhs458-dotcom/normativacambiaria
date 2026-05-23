import { NextRequest, NextResponse } from "next/server";
import { construirSystemPromptGuiado } from "@/lib/promptGuiado";

export const runtime = "nodejs";
export const maxDuration = 30;

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-opus-4-7";

interface Turno {
  role: "user" | "assistant";
  content: string;
}

export async function POST(req: NextRequest) {
  try {
    const { historial } = (await req.json()) as { historial: Turno[] };

    if (!Array.isArray(historial) || historial.length === 0) {
      return NextResponse.json(
        { error: "Falta el historial de la conversación." },
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

    const system = construirSystemPromptGuiado();

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
        messages: historial.map((t) => ({ role: t.role, content: t.content })),
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
    const textoCrudo = (data.content || [])
      .filter((b: { type: string }) => b.type === "text")
      .map((b: { text: string }) => b.text)
      .join("\n")
      .trim();

    // Parsear el JSON estructurado que devuelve el modelo.
    // Limpiamos posibles backticks por las dudas.
    let parsed;
    try {
      const limpio = textoCrudo.replace(/```json|```/g, "").trim();
      parsed = JSON.parse(limpio);
    } catch {
      // Fallback: si no devolvió JSON válido, tratamos el texto como pregunta.
      parsed = {
        accion: "preguntar",
        mensaje: textoCrudo,
        opciones: [],
        inhabilitantes_chequeados: [],
        progreso: "En curso",
      };
    }

    // Garantizar que opciones siempre exista como array.
    if (!Array.isArray(parsed.opciones)) parsed.opciones = [];

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("Error en /api/cuestionario:", err);
    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500 }
    );
  }
}
