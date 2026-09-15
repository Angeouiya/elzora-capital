import type { Metadata } from "next";
import { Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const hankenGrotesk = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Nexora Capital — Plateforme de financement participatif",
  description: "Financement direct de projets d'entreprises rigoureusement analysés en Afrique de l'Ouest.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className="h-full">
      <body
        className={`${hankenGrotesk.variable} ${jetbrainsMono.variable} bg-surface text-on-surface font-body-md text-body-md antialiased min-h-screen flex flex-col`}
      >
        {children}
      </body>
    </html>
  );
}
