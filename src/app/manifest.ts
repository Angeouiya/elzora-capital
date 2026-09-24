import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NEXORA Capital",
    short_name: "NEXORA",
    description: "Investissement privé et financement d’entreprises en Afrique de l’Ouest.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#FBFCF8",
    theme_color: "#380C31",
    orientation: "portrait-primary",
    categories: ["finance", "business"],
    icons: [
      {
        src: "/logo.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
