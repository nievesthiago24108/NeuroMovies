import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NeuroMovies",
    short_name: "NeuroMovies",
    description: "Seguimiento personal de películas y series, con datos de TMDB.",
    start_url: "/",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#0d9488",
    lang: "es",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
