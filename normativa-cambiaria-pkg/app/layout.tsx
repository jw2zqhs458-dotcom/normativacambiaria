import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Régimen Cambiario — Consulta de normativa argentina",
  description:
    "Consulta de normativa cambiaria argentina (BCRA, CNV, ARCA). Respuestas con cita de la norma vigente. Informativo, no vinculante.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es-AR">
      <body>{children}</body>
    </html>
  );
}
