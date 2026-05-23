/**
 * Detector de operaciones relevantes a la restricción cambiaria desde el
 * texto de un statement de comitente. Traducido del parser Python validado
 * contra statements reales de AUNE/Hegiris y VisualBolsa/ESCO.
 *
 * Filosofía: APOYO, no veredicto. Marca CANDIDATOS para que la persona confirme.
 * Todo corre en el NAVEGADOR: el statement nunca se sube a ningún servidor.
 */

// Bonos típicos para dólar bolsa (soberanos en USD).
const BONOS_DOLAR_BOLSA = new Set([
  "AL30", "GD30", "AL29", "GD29", "AL35", "GD35", "AL41", "GD38",
  "GD41", "AE38", "BPOA", "BPOB", "BPOC", "BPOD",
]);

export type Core = "aune" | "visualbolsa" | "desconocido";

export interface Operacion {
  fecha: string | null; // ISO
  tipo: "COMPRA" | "VENTA";
  especie: string;
  monedaLiq: "MEP" | "CCL" | "ARS" | "?";
}

export interface CandidatoMepCcl {
  fecha: string;
  especie: string;
  tipoOperacion: "MEP" | "CCL";
  detalle: string;
  dentroDe90Dias: boolean;
}

export interface Caucion {
  fecha: string | null;
  moneda: "ARS" | "USD";
  estado: "apertura" | "cierre" | "?";
}

export interface ResultadoAnalisis {
  coreDetectado: Core;
  candidatosMepCcl: CandidatoMepCcl[];
  caucionesTomadoras: Caucion[];
  totalOperaciones: number;
  nota: string;
}

function detectarCore(texto: string): Core {
  if (
    texto.includes("Reporte de Cuenta Corriente Consolidada") ||
    (texto.includes("Cod.") && texto.includes("Instrumento"))
  )
    return "aune";
  if (
    texto.includes("REPORTE DE MOVIMIENTOS") ||
    texto.includes("Concepto Especie Cantidad Precio Importe Estado")
  )
    return "visualbolsa";
  if (texto.includes("U$S D") || texto.includes("U$S C")) return "aune";
  if (texto.includes("(USDC") || texto.includes("(USD Inm")) return "visualbolsa";
  return "desconocido";
}

function parseFecha(s: string): string | null {
  // dd/mm/yyyy -> ISO yyyy-mm-dd
  const m = s.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, d, mes, y] = m;
  return `${y}-${mes}-${d}`;
}

function parseAune(texto: string): Operacion[] {
  const ops: Operacion[] = [];
  const lineas = texto.split("\n");
  const re =
    /(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})\s+Boleto\s*\/\s*\d+\s*\/\s*(COMPRA|VENTA)\s*\/\s*\d+\s*\/\s*([A-Z0-9]+)/;
  for (let i = 0; i < lineas.length; i++) {
    const m = lineas[i].match(re);
    if (!m) continue;
    const fecha = parseFecha(m[1]);
    const tipo = m[3] as "COMPRA" | "VENTA";
    const especie = m[4];
    const contexto = lineas[i] + " " + (lineas[i + 1] || "");
    let monedaLiq: Operacion["monedaLiq"];
    if (contexto.includes("U$S D") || contexto.includes("U$D")) monedaLiq = "MEP";
    else if (contexto.includes("U$S C")) monedaLiq = "CCL";
    else if (/\/\s*\$/.test(contexto)) monedaLiq = "ARS";
    else if (contexto.includes("U$S")) monedaLiq = "MEP";
    else monedaLiq = "?";
    ops.push({ fecha, tipo, especie, monedaLiq });
  }
  return ops;
}

function parseVisualbolsa(texto: string): { ops: Operacion[]; cauciones: Caucion[] } {
  const ops: Operacion[] = [];
  const cauciones: Caucion[] = [];
  const lineas = texto.split("\n");
  const reOp =
    /(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})\s+(Compra|Venta)\s+([A-Z0-9]+)\s+([-\d.,]+)/;
  const reCau =
    /(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})\s+Tomadora\s+(ARS|USD)\s+([\d.,]+)/;
  for (let i = 0; i < lineas.length; i++) {
    const m = lineas[i].match(reOp);
    if (m) {
      const fecha = parseFecha(m[2]); // concertación
      const tipo = m[3].toUpperCase() as "COMPRA" | "VENTA";
      const especie = m[4];
      const contexto = lineas.slice(i, i + 4).join(" ");
      let monedaLiq: Operacion["monedaLiq"];
      if (contexto.includes("(USDC")) monedaLiq = "CCL";
      else if (contexto.includes("(USD")) monedaLiq = "MEP";
      else monedaLiq = "ARS";
      ops.push({ fecha, tipo, especie, monedaLiq });
    }
    const c = lineas[i].match(reCau);
    if (c) {
      const contexto = lineas.slice(i, i + 4).join(" ");
      const estado = contexto.includes("Apertura")
        ? "apertura"
        : contexto.includes("Cierre")
        ? "cierre"
        : "?";
      cauciones.push({ fecha: parseFecha(c[2]), moneda: c[3] as "ARS" | "USD", estado });
    }
  }
  return { ops, cauciones };
}

function diasDesde(fechaIso: string): number {
  const f = new Date(fechaIso + "T00:00:00");
  const hoy = new Date();
  return Math.floor((hoy.getTime() - f.getTime()) / (1000 * 60 * 60 * 24));
}

function detectarMepCcl(ops: Operacion[]): CandidatoMepCcl[] {
  const candidatos: CandidatoMepCcl[] = [];
  const bonos = ops.filter((o) => BONOS_DOLAR_BOLSA.has(o.especie) && o.fecha);
  const porFecha = new Map<string, Operacion[]>();
  for (const o of bonos) {
    const key = `${o.especie}|${o.fecha}`;
    if (!porFecha.has(key)) porFecha.set(key, []);
    porFecha.get(key)!.push(o);
  }
  for (const [key, grupo] of porFecha) {
    const [especie, fecha] = key.split("|");
    const monedas = new Set(grupo.map((o) => o.monedaLiq));
    const tipos = new Set(grupo.map((o) => o.tipo));
    const noArs = new Set([...monedas].filter((m) => m !== "ARS"));
    if (tipos.has("COMPRA") && tipos.has("VENTA") && noArs.size >= 1 && monedas.size >= 2) {
      const tipoDolar = monedas.has("CCL") ? "CCL" : "MEP";
      candidatos.push({
        fecha,
        especie,
        tipoOperacion: tipoDolar,
        detalle: `Par compra/venta de ${especie} con liquidación en ${[...monedas].join(", ")}`,
        dentroDe90Dias: diasDesde(fecha) <= 90,
      });
    }
  }
  return candidatos.sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
}

export function analizarStatement(texto: string): ResultadoAnalisis {
  const core = detectarCore(texto);
  const base: ResultadoAnalisis = {
    coreDetectado: core,
    candidatosMepCcl: [],
    caucionesTomadoras: [],
    totalOperaciones: 0,
    nota: "",
  };

  if (core === "aune") {
    const ops = parseAune(texto);
    base.candidatosMepCcl = detectarMepCcl(ops);
    base.totalOperaciones = ops.length;
    base.nota = "Formato AUNE/Hegiris. Cauciones no se parsean en el reporte consolidado.";
  } else if (core === "visualbolsa") {
    const { ops, cauciones } = parseVisualbolsa(texto);
    base.candidatosMepCcl = detectarMepCcl(ops);
    base.caucionesTomadoras = cauciones;
    base.totalOperaciones = ops.length;
  } else {
    base.nota = "Formato no reconocido. Conviene seguir con el cuestionario por preguntas.";
  }

  return base;
}
