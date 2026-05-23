-- Esquema para la etapa 2 (scraper + ingesta automática).
-- Diseñado para Vercel Postgres con extensión pgvector.
-- En el MVP el corpus vive en data/corpus.json; esto es el destino.

CREATE EXTENSION IF NOT EXISTS vector;

-- Una fila por COMUNICACIÓN / norma scrapeada (documento crudo).
CREATE TABLE IF NOT EXISTS normas (
  id              TEXT PRIMARY KEY,            -- ej: "bcra-a-8331"
  organismo       TEXT NOT NULL,               -- BCRA | CNV | ARCA | AFIP
  tipo            TEXT NOT NULL,               -- comunicacion_a | resolucion_general | decreto
  numero          TEXT NOT NULL,               -- "8331"
  titulo          TEXT,
  fecha_emision   DATE,
  url_oficial     TEXT NOT NULL,
  texto_completo  TEXT,                        -- texto crudo scrapeado
  hash_contenido  TEXT,                        -- para detectar cambios sin re-procesar
  scrapeado_en    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (organismo, tipo, numero)
);

-- Relaciones entre normas: deroga / modifica / complementa.
-- Clave para resolver vigencia correctamente.
CREATE TABLE IF NOT EXISTS relaciones_normas (
  origen_id   TEXT REFERENCES normas(id),     -- la norma nueva
  destino_id  TEXT REFERENCES normas(id),     -- la norma afectada
  tipo        TEXT NOT NULL,                   -- deroga | modifica | complementa | reemplaza_punto
  punto       TEXT,                            -- punto específico afectado (ej "3.8.4")
  PRIMARY KEY (origen_id, destino_id, tipo, punto)
);

-- Fragmentos indexables (chunks) con su embedding.
-- Esto es lo que consulta el motor RAG.
CREATE TABLE IF NOT EXISTS fragmentos (
  id            TEXT PRIMARY KEY,              -- ej: "bcra-ec-3.8-atesoramiento-ph"
  norma_id      TEXT REFERENCES normas(id),
  cuerpo        TEXT NOT NULL,                 -- "Texto Ordenado Exterior y Cambios"
  seccion       TEXT,
  punto         TEXT,
  estado        TEXT NOT NULL DEFAULT 'vigente', -- vigente | derogado | modificado
  vigencia_desde DATE,
  vigencia_hasta DATE,
  tags          TEXT[],
  texto         TEXT NOT NULL,
  embedding     vector(1024),                  -- dimensión según modelo de embeddings
  actualizado_en TIMESTAMPTZ DEFAULT now()
);

-- Índice para búsqueda vectorial por similitud coseno.
CREATE INDEX IF NOT EXISTS idx_fragmentos_embedding
  ON fragmentos USING hnsw (embedding vector_cosine_ops);

-- Índice de texto completo en español para búsqueda híbrida (BM25-like).
CREATE INDEX IF NOT EXISTS idx_fragmentos_fts
  ON fragmentos USING gin (to_tsvector('spanish', texto));

CREATE INDEX IF NOT EXISTS idx_fragmentos_estado ON fragmentos (estado);
CREATE INDEX IF NOT EXISTS idx_fragmentos_norma ON fragmentos (norma_id);

-- Log de consultas (analítica + mejora del corpus, sin datos sensibles).
CREATE TABLE IF NOT EXISTS consultas_log (
  id          BIGSERIAL PRIMARY KEY,
  pregunta    TEXT NOT NULL,
  n_fuentes   INT,
  sin_resultado BOOLEAN DEFAULT false,         -- detecta gaps en el corpus
  creado_en   TIMESTAMPTZ DEFAULT now()
);
