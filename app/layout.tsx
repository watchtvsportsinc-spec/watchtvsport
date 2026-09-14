import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import Script from "next/script";
import HeaderNav from "./HeaderNav";

export const metadata: Metadata = {
  metadataBase: new URL("https://watchtvsport.com"),
  title: {
    default: "WatchTVSport | Official Sports Broadcasters Worldwide",
    template: "%s | WatchTVSport",
  },
  description:
    "Find where to watch sports legally. Compare official TV channels and streaming platforms by event and territory.",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },
  applicationName: "WatchTVSport",
  keywords: [
    "where to watch sports",
    "official broadcasters",
    "sports TV channels",
    "watch sports by country",
    "free sports broadcast",
    "legal sports streaming options",
    "FIFA World Cup 2026",
    "TV channels by country",
  ],
  authors: [{ name: "WatchTVSport" }],
  creator: "WatchTVSport",
  publisher: "WatchTVSport",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: "WatchTVSport",
    title: "WatchTVSport | Official Sports Broadcasters Worldwide",
    description:
      "Compare official sports broadcasters by event and territory, including free and paid viewing options.",
    url: "/",
    images: [
      {
        url: "https://watchtvsport.com/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "WatchTVSport - Official sports broadcasters worldwide",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "WatchTVSport | Official Sports Broadcasters Worldwide",
    description:
      "Find official sports broadcasters and compare legal viewing options worldwide.",
    images: ["https://watchtvsport.com/og-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
  },
  category: "sports",
};



export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "WatchTVSport",
    url: "https://watchtvsport.com",
logo: "https://watchtvsport.com/logo-watchtvsport-v3.png",
    description:
      "WatchTVSport helps users find where to watch sports legally using official broadcaster information only.",
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "WatchTVSport",
    url: "https://watchtvsport.com",
    description:
      "Find official sports broadcasters by event and territory.",
  };

return (
  <html lang="en">
 <head>
  <script
    async
    src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5316440056832386"
    crossOrigin="anonymous"
  />
</head>

    <body
      style={{
        margin: 0,
        background: "#0B1220",
        color: "#FFFFFF",
        fontFamily: "Inter, system-ui, Arial, sans-serif",
      }}
    >
<style>{`
  @media (max-width: 768px) {
    .headerLogo {
      width: 132px !important;
      height: 25px !important;
    }
  }

  @media (min-width: 390px) and (max-width: 768px) {
    .headerLogo {
      width: 160px !important;
      height: 30px !important;
    }
  }
`}</style>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />

        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            background: "#0B1220",
          }}
        >
          <header
            style={{
              position: "sticky",
              top: 0,
              zIndex: 20,
              height: "48px",
              backdropFilter: "blur(10px)",
              background: "rgba(11,18,32,0.88)",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div
              style={{
                maxWidth: "1100px",
                height: "48px",
                margin: "0 auto",
                padding: "0 1rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "1rem",
                flexWrap: "nowrap",
              }}
            >
              <Link
                href="/"
                style={{
                  textDecoration: "none",
                  color: "#FFFFFF",
                  display: "inline-flex",
                  alignItems: "center",
                }}
              >
<Image
  src="/logo-watchtvsport-v3.png"
  alt="WatchTVSport logo"
  width={320}
  height={60}
  priority
  className="headerLogo"
  style={{
    width: "224px",
    height: "42px",
    display: "block",
    objectFit: "contain",
  }}
/>
              </Link>

              <HeaderNav />
            </div>
          </header>

          <div style={{ flex: 1 }}>{children}</div>

          <footer
            style={{
              borderTop: "1px solid rgba(255,255,255,0.08)",
              background: "#0F172A",
              marginTop: "2rem",
            }}
          >
            <div
              style={{
                maxWidth: "1100px",
                margin: "0 auto",
                padding: "2rem 1rem",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "1.5rem",
              }}
            >
              <div>
                <div
                  style={{
                    fontWeight: 800,
                    marginBottom: "0.75rem",
                    fontSize: "1rem",
                  }}
                >
                  WatchTVSport
                </div>

                <p
                  style={{
                    color: "#CBD5E1",
                    lineHeight: 1.7,
                    margin: 0,
                    fontSize: "0.95rem",
                  }}
                >
                  Find where to watch sports legally. Compare official
                  broadcasters, TV channels, and platforms by event and
                  territory.
                </p>
              </div>

              <div>
                <div
                  style={{
                    fontWeight: 800,
                    marginBottom: "0.75rem",
                    fontSize: "1rem",
                  }}
                >
                  Navigation
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.55rem",
                  }}
                >
                  <Link
                    href="/"
                    style={{
                      textDecoration: "none",
                      color: "#CBD5E1",
                    }}
                  >
                    Homepage
                  </Link>

                  <Link
                    href="/?view=archive&competition=fifa-world-cup-2026"
                    style={{
                      textDecoration: "none",
                      color: "#CBD5E1",
                    }}
                  >
                    FIFA World Cup 2026 archive
                  </Link>
                </div>
              </div>

              <div>
                <div
                  style={{
                    fontWeight: 800,
                    marginBottom: "0.75rem",
                    fontSize: "1rem",
                  }}
                >
                  Policy
                </div>

                <p
                  style={{
                    color: "#CBD5E1",
                    lineHeight: 1.7,
                    margin: 0,
                    fontSize: "0.95rem",
                  }}
                >
                  WatchTVSport only lists official broadcasters. No illegal
                  streams. No VPN recommendations. Information is provided for
                  legal viewing options only.
                </p>
              </div>
            </div>

            <div
              style={{
                borderTop: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div
                style={{
                  maxWidth: "1100px",
                  margin: "0 auto",
                  padding: "1rem",
                  color: "#94A3B8",
                  fontSize: "0.9rem",
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "1rem",
                  flexWrap: "wrap",
                }}
              >
                <div
  style={{
    display: "flex",
    gap: "1rem",
    flexWrap: "wrap",
    alignItems: "center",
  }}
>
  <span>© 2026 WatchTVSport</span>

  <Link
    href="/calendar"
    style={{
      color: "#60A5FA",
      textDecoration: "none",
      fontWeight: 700,
    }}
  >
    📅 World Cup 2026 Calendar
  </Link>
</div>

<span>Legal viewing information only</span>
              </div>
            </div>
          </footer>
        </div>

        <Analytics />

        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-2V9H3M35PT"
          strategy="afterInteractive"
        />

        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-2V9H3M35PT');
          `}
        </Script>
      </body>
    </html>
  );
}
