import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import Script from "next/script";

export const metadata: Metadata = {
  metadataBase: new URL("https://watchtvsport.com"),
  title: {
    default: "WatchTVSport | Where to Watch Football Matches Legally",
    template: "%s | WatchTVSport",
  },
  description:
    "Find where to watch football matches legally by country. Compare official broadcasters, TV channels, and free or paid viewing options for FIFA World Cup 2026 matches.",
  icons: {
  icon: "/favicon.ico",
  shortcut: "/favicon.ico",
  apple: "/favicon.ico",
},
    applicationName: "WatchTVSport",
  keywords: [
    "where to watch football",
    "official broadcasters",
    "world cup 2026 TV channels",
    "watch football by country",
    "free football broadcast",
    "legal football streaming options",
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
    title: "WatchTVSport | Where to Watch Football Matches Legally",
    description:
      "Compare official football broadcasters by country and see where FIFA World Cup 2026 matches are available for free or paid.",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "WatchTVSport | Where to Watch Football Matches Legally",
    description:
      "Find official football broadcasters by country and compare legal viewing options worldwide.",
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
    logo: "https://watchtvsport.com/logo-watchtvsport-v3.webp",
    description:
      "WatchTVSport helps users find where to watch football matches legally by country using official broadcaster information only.",
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "WatchTVSport",
    url: "https://watchtvsport.com",
    description:
      "Find where to watch football matches legally by country.",
  };

  return (
    <html lang="en">
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
                  src="/logo-watchtvsport-v3.webp"
                  alt="WatchTVSport logo"
                  width={320}
                  height={60}
                  unoptimized
                  className="headerLogo"
                  style={{
                    height: "42px",
                    width: "auto",
                    display: "block",
                    objectFit: "contain",
                  }}
                />
              </Link>

              <nav
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                  flexWrap: "nowrap",
                }}
              >
                <Link
                  href="/"
                  style={{
                    textDecoration: "none",
                    color: "#CBD5E1",
                    fontWeight: 600,
                  }}
                >
                  Home
                </Link>

                <Link
                  href="/schedule"
                  style={{
                    textDecoration: "none",
                    color: "#CBD5E1",
                    fontWeight: 600,
                  }}
                >
                  Schedule
                </Link>

                <Link
                  href="/country"
                  style={{
                    textDecoration: "none",
                    color: "#FFFFFF",
                    background: "#3B82F6",
                    fontWeight: 700,
                    padding: "0.35rem 0.70rem",
                    borderRadius: "9px",
                    fontSize: "0.9rem",
                    lineHeight: 1,
                  }}
                >
                  Countries
                </Link>
              </nav>
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
                  Find where to watch football matches legally by country.
                  Compare official broadcasters, TV channels, and free or paid
                  viewing options worldwide.
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
                    href="/"
                    style={{
                      textDecoration: "none",
                      color: "#CBD5E1",
                    }}
                  >
                    FIFA World Cup 2026
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
                <span>© 2026 WatchTVSport</span>
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