"use client";

import React from "react";

/**
 * Render mínimo de Markdown para las respuestas del modelo.
 * Soporta lo que Claude realmente usa: encabezados (##), negrita (**texto**),
 * listas con guion, y párrafos. Evita dependencias externas y NO usa
 * dangerouslySetInnerHTML (parsea a elementos React, más seguro).
 */

// Convierte **negrita** dentro de una línea en <strong>.
function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const partes: React.ReactNode[] = [];
  const regex = /\*\*(.+?)\*\*/g;
  let ultimo = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > ultimo) {
      partes.push(text.slice(ultimo, m.index));
    }
    partes.push(
      <strong key={`${keyPrefix}-b${i}`} style={{ fontWeight: 600 }}>
        {m[1]}
      </strong>
    );
    ultimo = m.index + m[0].length;
    i++;
  }
  if (ultimo < text.length) {
    partes.push(text.slice(ultimo));
  }
  return partes;
}

export function Markdown({ texto }: { texto: string }) {
  const lineas = texto.split("\n");
  const bloques: React.ReactNode[] = [];
  let listaActual: string[] = [];
  let key = 0;

  const cerrarLista = () => {
    if (listaActual.length > 0) {
      const items = [...listaActual];
      bloques.push(
        <ul
          key={`ul-${key++}`}
          style={{ margin: "8px 0 8px 0", paddingLeft: 22 }}
        >
          {items.map((it, idx) => (
            <li key={idx} style={{ marginBottom: 4 }}>
              {renderInline(it, `li-${key}-${idx}`)}
            </li>
          ))}
        </ul>
      );
      listaActual = [];
    }
  };

  for (const linea of lineas) {
    const l = linea.trimEnd();

    // Encabezados ## y ###
    const hMatch = l.match(/^(#{2,3})\s+(.*)$/);
    if (hMatch) {
      cerrarLista();
      const nivel = hMatch[1].length;
      bloques.push(
        <div
          key={`h-${key++}`}
          style={{
            fontFamily: "Fraunces, serif",
            fontWeight: 600,
            fontSize: nivel === 2 ? 19 : 16.5,
            marginTop: 20,
            marginBottom: 8,
            color: "var(--accent)",
          }}
        >
          {renderInline(hMatch[2], `h-${key}`)}
        </div>
      );
      continue;
    }

    // Ítems de lista: "- ", "* ", o "  - "
    const liMatch = l.match(/^\s*[-*]\s+(.*)$/);
    if (liMatch) {
      listaActual.push(liMatch[1]);
      continue;
    }

    // Línea en blanco: separa bloques
    if (l.trim() === "") {
      cerrarLista();
      continue;
    }

    // Párrafo normal
    cerrarLista();
    bloques.push(
      <p key={`p-${key++}`} style={{ margin: "8px 0", lineHeight: 1.7 }}>
        {renderInline(l, `p-${key}`)}
      </p>
    );
  }
  cerrarLista();

  return <div>{bloques}</div>;
}
