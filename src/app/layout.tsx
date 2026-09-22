import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NEXORA Capital — Financement participatif en Afrique de l'Ouest",
  description:
    "Plateforme de financement participatif pour l'Afrique de l'Ouest. Investissez en dette ou en capital dans des entreprises vérifiées. À partir de 10 000 FCFA.",
  keywords: [
    "financement participatif",
    "Afrique de l'Ouest",
    "UEMOA",
    "XOF",
    "FCFA",
    "dette",
    "capital",
    "crowdfunding",
  ],
  authors: [{ name: "NEXORA Capital" }],
  icons: {
    icon: "/logo.svg",
    shortcut: "/logo.svg",
    apple: "/logo.svg",
  },
  openGraph: {
    title: "NEXORA Capital",
    description: "Financement participatif pour l'Afrique de l'Ouest.",
    siteName: "NEXORA Capital",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
