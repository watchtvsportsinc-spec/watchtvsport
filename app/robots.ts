import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
      },
    ],
    sitemap: "https://watchtvsport.com/sitemap.xml",
    host: "https://watchtvsport.com",
  };
}