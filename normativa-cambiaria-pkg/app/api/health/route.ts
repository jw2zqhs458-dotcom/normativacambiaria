import { NextResponse } from "next/server";
import { totalFragmentos, META } from "@/lib/retrieval";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    ok: true,
    corpus: {
      fragmentos: totalFragmentos(),
      ultima_actualizacion: META.ultima_actualizacion_corpus,
    },
    api_key_configurada: Boolean(process.env.ANTHROPIC_API_KEY),
  });
}
