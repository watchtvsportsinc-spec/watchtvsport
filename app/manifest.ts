import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "WatchTVSport",
    short_name: "WatchTVSport",
    description: "Official sports broadcast guide and operator notifications.",
    start_url: "/",
    display: "standalone",
    background_color: "#050B13",
    theme_color: "#0B1220",
    icons: [
      { src: "/favicon.png", sizes: "any", type: "image/png" },
    ],
  };
}
