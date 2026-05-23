# Régimen Cambiario — Motor de consulta de normativa argentina

MVP de una plataforma de consulta sobre normativa cambiaria argentina (BCRA, CNV, ARCA/AFIP). Responde preguntas en lenguaje natural **citando siempre la norma vigente** que sustenta la respuesta, con disclaimers de no vinculancia.

## Qué hace (y qué NO hace todavía)

**Hace (etapa 1 - este MVP):**
- Recibe una consulta en lenguaje natural.
- Recupera los fragmentos normativos relevantes de un corpus curado (RAG).
- Llama a Claude **server-side** (API key protegida) para responder **solo** a partir de esos fragmentos, citando organismo, cuerpo, punto y comunicación.
- Si no hay norma en el corpus que cubra el caso, lo dice en vez de inventar.
- Muestra al usuario las fuentes consultadas con su estado de vigencia.

**Todavía NO hace (próximas etapas):**
- Scraping automático de comunicaciones nuevas (etapa 2).
- Base de datos vectorial / embeddings (esquema listo en `data/schema.sql`).
- CNV y ARCA con scraper propio (etapa 3).

## Arquitectura

```
app/
  page.tsx              UI de consulta (institucional, server-side rendering)
  api/consulta/route.ts Endpoint RAG: recupera + llama a Anthropic (key server-side)
  api/health/route.ts   Estado del corpus y de la config
lib/
  retrieval.ts          Motor de recuperación (keyword scoring; hook para embeddings)
  prompt.ts             Reglas estrictas de RAG: solo corpus, cita siempre, disclaimers
data/
  corpus.json           Corpus semilla curado (régimen post-reforma abril 2025)
  schema.sql            Esquema Postgres+pgvector para la etapa 2
```

La pieza crítica de seguridad jurídica está en `lib/prompt.ts`: el modelo tiene prohibido responder de memoria. Solo usa los fragmentos recuperados. Esto evita que dé información cambiaria desactualizada, que es el principal riesgo de una herramienta así.

## Cómo correrlo localmente

```bash
npm install
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env.local
npm run dev
# abrir http://localhost:3000
```

## Deploy en Vercel

1. Subí el repo a GitHub.
2. Importá el proyecto en Vercel.
3. En **Settings → Environment Variables**, agregá `ANTHROPIC_API_KEY` con tu key. **Nunca** la pongas en el código ni en variables `NEXT_PUBLIC_*`.
4. Deploy. Listo.

> **Nota de seguridad:** este proyecto usa Next.js 15.1.11, que incluye los parches de los CVE de diciembre 2025 (React Server Components). Si en el futuro Vercel/Next avisan de un nuevo CVE, actualizá a la última patch de la línea 15.1.x.

## Cómo se actualiza el corpus (mientras no hay scraper)

Editá `data/corpus.json`. Cada fragmento necesita: `id`, `organismo`, `cuerpo`, `seccion`, `punto`, `comunicacion_origen`, `estado`, `tags`, `texto`, `fuente_url`. Los `tags` pesan más en la búsqueda, así que curarlos bien mejora mucho el retrieval.

## Roadmap

- **Etapa 2 — Scraper BCRA:** job que detecta comunicaciones nuevas, parsea el Texto Ordenado de Exterior y Cambios (PDF en URL estable), trackea qué deroga/modifica cada una, re-indexa. Migrar corpus a Postgres+pgvector.
- **Etapa 3 — CNV + ARCA:** scrapers dedicados por organismo.
- **Etapa 4 — Embeddings:** reemplazar el keyword scoring de `lib/retrieval.ts` por búsqueda vectorial híbrida (el hook ya está aislado en `recuperar()`).

## Advertencia legal

Herramienta informativa, **no vinculante**. No constituye asesoramiento legal, contable ni cambiario. La normativa cambia con frecuencia. Verificar siempre contra la fuente oficial y consultar a un profesional antes de operar.
