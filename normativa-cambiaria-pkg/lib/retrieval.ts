import corpus from "@/data/corpus.json";

export interface Fragmento {
  id: string;
  organismo: string;
  cuerpo: string;
  seccion: string;
  punto: string;
  comunicacion_origen: string;
  estado: string;
  vigencia_desde?: string;
  tags: string[];
  texto: string;
  fuente_url: string;
}

export interface FragmentoConScore extends Fragmento {
  score: number;
}

export const META = corpus._meta;
const FRAGMENTOS = corpus.fragmentos as Fragmento[];

// Normaliza texto: minúsculas, sin acentos, sin puntuación.
function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Stopwords en español que no aportan a la búsqueda.
const STOP = new Set([
  "el", "la", "los", "las", "un", "una", "unos", "unas", "de", "del", "a",
  "en", "y", "o", "que", "se", "por", "para", "con", "su", "sus", "al",
  "es", "son", "como", "mi", "me", "puedo", "puede", "pueden", "si", "no",
  "lo", "le", "este", "esta", "estos", "estas", "ser", "hacer", "tengo",
]);

function tokenizar(s: string): string[] {
  return normalizar(s)
    .split(" ")
    .filter((t) => t.length > 2 && !STOP.has(t));
}

/**
 * Búsqueda híbrida simple por scoring de keywords sobre tags + texto.
 * Pensada como MVP. El hook para reemplazar por embeddings/pgvector
 * está aislado en esta función: cambiar acá no afecta al resto.
 */
export function recuperar(pregunta: string, k = 4): FragmentoConScore[] {
  const tokensQ = tokenizar(pregunta);
  if (tokensQ.length === 0) return [];

  const scored: FragmentoConScore[] = FRAGMENTOS.map((f) => {
    const textoNorm = normalizar(f.texto + " " + f.seccion + " " + f.cuerpo);
    const tagsNorm = f.tags.map(normalizar);
    const tokensDoc = new Set(tokenizar(textoNorm));

    let score = 0;
    for (const t of tokensQ) {
      // Coincidencia exacta en tags pesa más (los tags son curados).
      if (tagsNorm.some((tag) => tag.includes(t))) score += 3;
      // Coincidencia en el cuerpo del texto.
      if (tokensDoc.has(t)) score += 1;
      // Coincidencia parcial (substring) en el texto, peso menor.
      else if (textoNorm.includes(t)) score += 0.5;
    }
    // Bonus a normas vigentes frente a derogadas.
    if (f.estado === "vigente") score += 0.25;

    return { ...f, score };
  });

  return scored
    .filter((f) => f.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

export function totalFragmentos(): number {
  return FRAGMENTOS.length;
}
