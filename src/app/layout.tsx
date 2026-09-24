import type { Metadata, Viewport } from "next";
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
  title: "NEXORA Capital — Capital privé · Private capital",
  description:
    "Capital privé en Afrique de l'Ouest · Private capital in West Africa. Dette et capital, dès 10 000 francs CFA.",
  keywords: [
    "financement participatif",
    "Afrique de l'Ouest",
    "UEMOA",
    "franc CFA",
    "dette",
    "capital",
    "crowdfunding",
  ],
  authors: [{ name: "NEXORA Capital" }],
  applicationName: "NEXORA Capital",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "NEXORA",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/logo.svg",
    shortcut: "/logo.svg",
    apple: "/logo.svg",
  },
  openGraph: {
    title: "NEXORA Capital",
    description: "Capital privé en Afrique de l'Ouest · Private capital in West Africa.",
    siteName: "NEXORA Capital",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  colorScheme: "light",
  themeColor: "#380C31",
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
