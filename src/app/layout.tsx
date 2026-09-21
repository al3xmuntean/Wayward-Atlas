import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme";
import { LanguageProvider } from "@/lib/i18n/context";

export const metadata: Metadata = {
  title: "Wayward Atlas — Jurnal Geografic 3D & Galerie Showcase",
  description:
    "Explorează călătoriile tale pe un Glob 3D interactiv sau în galeria de expediții în stil CSS Nectar cu filtrare pe roluri și analiză AI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ro" suppressHydrationWarning className="dark">
      <head>
        <meta name="color-scheme" content="dark light" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('wayward_theme');
                  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  var theme = saved === 'light' ? 'light' : (saved === 'dark' ? 'dark' : (prefersDark ? 'dark' : 'light'));
                  var root = document.documentElement;
                  root.classList.remove('dark', 'light');
                  root.classList.add(theme);
                  root.setAttribute('data-theme', theme);
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased overflow-x-hidden">
        {/* Skip to Main Content Link for Keyboard & Screen Reader Users (WCAG 2.4.1) */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2.5 focus:bg-olive-700 focus:text-white focus:rounded-xl focus:shadow-2xl focus:ring-2 focus:ring-olive-400 focus:font-bold focus:text-xs"
        >
          Salt la conținutul principal (Skip to main content)
        </a>
        <ThemeProvider>
          <LanguageProvider>{children}</LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
