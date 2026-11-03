import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Disponibilidad de Horarios | Coordinación Grupal",
  description: "Encuentra el mejor horario para reuniones de grupo fácilmente con un mapa de calor compartido.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 font-sans">{children}</body>
    </html>
  );
}

