import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wayward Atlas — Jurnal Geografic 3D pe Globul Terestru",
  description:
    "Explorează călătoriile tale pe un Glob 3D interactiv cu zoom orbital, extragere automată EXIF, filtrare cronologică pe ani și analiză vizuală AI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ro" className="dark">
      <body className="antialiased bg-[#050811] text-slate-100 overflow-hidden select-none">
        {children}
      </body>
    </html>
  );
}
