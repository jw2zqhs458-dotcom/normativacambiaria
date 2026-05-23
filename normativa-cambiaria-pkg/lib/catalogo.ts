/**
 * Catálogo de inhabilitantes — flujo persona humana (compra USD / giro al exterior).
 * Investigado contra fuente oficial y validado por el usuario (mayo 2026).
 * Estas son las BARANDAS del motor: la IA no puede concluir "habilitado"
 * sin haber recorrido los inhabilitantes aplicables.
 */

export interface Inhabilitante {
  id: string;
  nombre: string;
  norma: string;
  pregunta: string;
  critico: boolean; // si es true, no se puede concluir sin chequearlo
  detalle: string;
}

export const FLUJO_PERSONA_HUMANA = {
  nombre: "Persona humana — compra de USD / atesoramiento / giro al exterior",
  datos_base: [
    "¿Sos persona humana o consultás por una empresa/persona jurídica? (si es jurídica, este flujo no aplica)",
    "¿Sos residente fiscal argentino?",
    "¿Qué querés hacer: comprar USD para atesoramiento, girar a una cuenta propia en el exterior, o enviar ayuda familiar?",
    "¿Pensás comprar por transferencia/depósito o en efectivo (billetes)?",
  ],
  inhabilitantes: [
    {
      id: "INH-01",
      nombre: "Restricción cruzada MULC ↔ MEP/CCL (90 días)",
      norma: "BCRA, Texto Ordenado Exterior y Cambios, punto 3.8.5 (Com. A 8336, modif. A 8361)",
      pregunta:
        "¿Compraste dólar MEP o CCL (títulos con liquidación en moneda extranjera) en los últimos 90 días corridos? ¿Y pensás operarlos en los próximos 90 días?",
      critico: true,
      detalle:
        "Quien accede al MULC firma DDJJ de no comprar títulos con liquidación en MX por 90 días corridos. En la práctica las entidades lo aplican bidireccional: operar MEP/CCL frena el acceso al MULC por 90 días. EXCEPCIONES (A 8361): suscripciones primarias de deuda de residentes mantenidas 15+ días hábiles, y reinversión de cupones del Tesoro/BCRA dentro de 15 días hábiles.",
    },
    {
      id: "INH-05",
      nombre: "Posiciones tomadoras en cauciones/pases o financiamiento de mercado",
      norma: "CNV, Resolución General 1062/2025",
      pregunta:
        "¿Tenés hoy posiciones tomadoras en cauciones o pases en pesos, o algún financiamiento tomado en el mercado de capitales (en cualquier agente, como titular o cotitular)?",
      critico: true,
      detalle:
        "Si mantenés caución/pase tomador en pesos o financiamiento de mercado, no podés vender valores con liquidación en MX (MEP/CCL de salida). Alcanza titularidad y cotitularidad, en cualquier agente. EXCEPCIÓN clave: el financiamiento vía emisiones de deuda con oferta pública autorizada por CNV (ej. ON) NO inhabilita.",
    },
    {
      id: "INH-04",
      nombre: "Consistencia de ingresos / activos",
      norma: "BCRA, Texto Ordenado Exterior y Cambios, puntos 1.1 y 3.8",
      pregunta:
        "¿Tenés ingresos declarados o activos consistentes con el monto que querés comprar?",
      critico: false,
      detalle:
        "La operación debe ser consistente con ingresos/activos declarados (carácter genuino). No es veto automático: lo evalúa la entidad.",
    },
    {
      id: "INH-02",
      nombre: "Tope de compra en efectivo",
      norma: "BCRA, Texto Ordenado Exterior y Cambios, punto 3.8 (Com. A 8226)",
      pregunta: "(solo si eligió efectivo) El monto en efectivo, ¿supera USD 100 en el mes?",
      critico: false,
      detalle:
        "Efectivo limitado a USD 100/mes. Por transferencia/depósito: sin tope (sujeto a INH-01).",
    },
    {
      id: "INH-03",
      nombre: "Tope de ayuda familiar",
      norma: "BCRA, Texto Ordenado Exterior y Cambios, punto 3.8 concepto I07",
      pregunta: "(solo si es ayuda familiar) El giro, ¿supera USD 200 en el mes?",
      critico: false,
      detalle:
        "Ayuda familiar (I07) tope USD 200/mes. Transferencia a cuenta propia (atesoramiento): sin tope, sujeto a INH-01.",
    },
  ] as Inhabilitante[],
};
