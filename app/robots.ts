import type { MetadataRoute } from "next";

const BLOCKED_AI_CRAWLERS = [
  "ClaudeBot",
  "GPTBot",
  "CCBot",
  "Bytespider",
  "Amazonbot",
  "Applebot-Extended",
  "PerplexityBot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      ...BLOCKED_AI_CRAWLERS.map((userAgent) => ({ userAgent, disallow: "/" })),
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/"],
      },
    ],
    sitemap: "https://watchtvsport.com/sitemap.xml",
    host: "https://watchtvsport.com",
  };
}
