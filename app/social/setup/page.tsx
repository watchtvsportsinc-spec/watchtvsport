import type { Metadata } from "next";
import SocialSetupClient from "./SocialSetupClient";

export const metadata: Metadata = { title: "Social notifications", robots: { index: false, follow: false } };

export default function SocialSetupPage() {
  return <main style={{maxWidth:620,margin:"0 auto",padding:"40px 18px 80px"}}>
    <h1 style={{fontSize:"clamp(28px,8vw,44px)",marginBottom:12}}>Post notifications</h1>
    <p style={{color:"#cbd5e1",lineHeight:1.7}}>Install WatchTVSport on your phone, then enable notifications here. When an event post is ready, tapping the notification will open the private review screen before anything is sent to X.</p>
    <div style={{margin:"22px 0",padding:18,border:"1px solid #273449",borderRadius:14,background:"#0b1220"}}><SocialSetupClient/></div>
    <p style={{color:"#94a3b8",fontSize:14,lineHeight:1.6}}>iPhone: open this page in Safari, use Share → Add to Home Screen, open WatchTVSport from the new icon, then return here and enable notifications.</p>
  </main>;
}
