import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import "./globals.css";
import "./v2-cinematic.css";
import "./ux-friendly.css";
import "./entity-navigation.css";
import "./match-page.css";
import "./home-premium.css";
import "./home-premium-visual.css";
import "./seo-crawl.css";
import "./mobile-density.css";
import "./match-ux-compact.css";
import "./match-next-tweaks.css";
import "./broadcaster-logos.css";
import "./home-favorites-compact.css";
import "./header-v2.css";
import "./home-v3-tweaks.css";
import { Analytics } from "@vercel/analytics/next";
import Script from "next/script";
import HeaderNav from "./HeaderNav";

export const metadata: Metadata = {
  metadataBase: new URL("https://watchtvsport.com"),
  title: { default: "WatchTVSport | Where to Watch Sports Worldwide", template: "%s" },
  description: "Find where to watch sports legally. Compare official TV channels and streaming platforms for football, Formula 1, UFC and more by event and country.",
  icons: { icon: "/favicon.ico", shortcut: "/favicon.ico", apple: "/favicon.ico" },
  applicationName: "WatchTVSport",
  authors: [{ name: "WatchTVSport" }], creator: "WatchTVSport", publisher: "WatchTVSport",
  openGraph: { type: "website", siteName: "WatchTVSport", title: "WatchTVSport | Where to Watch Sports Worldwide", description: "Official sports TV and streaming information by event and country.", url: "/" },
  twitter: { card: "summary_large_image", title: "WatchTVSport | Where to Watch Sports Worldwide", description: "Find official sports broadcasters worldwide." },
  robots: { index: true, follow: true }, category: "sports",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body style={{margin:0,background:"#050B13",color:"#FFF",fontFamily:"Inter,system-ui,Arial,sans-serif"}}><div style={{minHeight:"100vh",display:"flex",flexDirection:"column",background:"#050B13"}}><header style={{position:"sticky",top:0,zIndex:30,height:56,backdropFilter:"blur(14px)",background:"rgba(5,11,19,.9)",borderBottom:"1px solid rgba(255,255,255,.08)"}}><div style={{maxWidth:1240,height:56,margin:"0 auto",padding:"0 1rem",display:"flex",alignItems:"center",justifyContent:"space-between",gap:"1rem"}}><Link href="/" style={{display:"inline-flex"}}><Image src="/logo-watchtvsport-v3.png" alt="WatchTVSport" width={320} height={60} priority className="headerLogo" style={{width:210,height:"auto",objectFit:"contain"}}/></Link><HeaderNav /></div></header><div style={{flex:1}}>{children}</div><footer style={{borderTop:"1px solid rgba(255,255,255,.08)",background:"#07111b",marginTop:"2rem"}}><div style={{maxWidth:1240,margin:"0 auto",padding:"2.2rem 1rem",display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:"1.5rem"}}><div><strong>WatchTVSport</strong><p style={{color:"#9fb0c3",lineHeight:1.7}}>Le sport se regarde partout. Official broadcast information by event and territory.</p></div><div><strong>Explore</strong><p><Link href="/football" style={{color:"#60a5fa"}}>Football</Link></p><p><Link href="/formula-1" style={{color:"#60a5fa"}}>Formula 1</Link></p><p><Link href="/ufc" style={{color:"#60a5fa"}}>UFC</Link></p><p><Link href="/events" style={{color:"#60a5fa"}}>All events</Link></p><p><Link href="/country" style={{color:"#60a5fa"}}>Countries</Link></p><p><Link href="/archive/world-cup-2026" style={{color:"#60a5fa"}}>World Cup 2026 archive</Link></p></div><div><strong>Trust & methodology</strong><p style={{color:"#9fb0c3",lineHeight:1.7}}>Official broadcasters only. No illegal streams and no VPN circumvention guidance.</p><p><Link href="/methodology" style={{color:"#60a5fa"}}>How listings are verified</Link></p><p><Link href="/report-error" style={{color:"#60a5fa"}}>Report an error</Link></p></div></div><div style={{borderTop:"1px solid rgba(255,255,255,.08)",padding:"1rem",textAlign:"center",color:"#71849a",fontSize:13}}>© 2026 WatchTVSport · Independent official broadcast guide</div></footer></div><Analytics/><Script src="https://www.googletagmanager.com/gtag/js?id=G-2V9H3M35PT" strategy="afterInteractive"/><Script id="google-analytics" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','G-2V9H3M35PT');`}</Script></body></html>;
}
