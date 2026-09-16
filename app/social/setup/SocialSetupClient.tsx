"use client";

import { useState } from "react";

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export default function SocialSetupClient() {
  const [operatorToken, setOperatorToken] = useState("");
  const [message, setMessage] = useState("Notifications not configured.");
  const [busy, setBusy] = useState(false);

  async function enable() {
    setBusy(true);
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) throw new Error("Web Push is not supported on this browser.");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Notification permission was not granted.");
      const registration = await navigator.serviceWorker.register("/social-push-sw.js");
      const keyResponse = await fetch("/api/social/vapid-key", { cache: "no-store" });
      if (!keyResponse.ok) throw new Error("Notification public key is not configured yet.");
      const { publicKey } = await keyResponse.json();
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }
      const response = await fetch("/api/social/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-watchtvsport-operator-token": operatorToken },
        body: JSON.stringify(subscription.toJSON()),
      });
      if (!response.ok) throw new Error((await response.json().catch(() => null))?.error || "Unable to register this phone.");
      setOperatorToken("");
      setMessage("Notifications enabled on this device.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Notification setup failed.");
    } finally {
      setBusy(false);
    }
  }

  return <div style={{display:"grid",gap:14}}>
    <label style={{display:"grid",gap:7}}><span>Operator activation code</span><input type="password" value={operatorToken} onChange={(e)=>setOperatorToken(e.target.value)} autoComplete="off" style={{padding:"12px 14px",borderRadius:10,border:"1px solid #334155",background:"#0f172a",color:"white",fontSize:16}}/></label>
    <button onClick={enable} disabled={busy || !operatorToken} style={{padding:"13px 16px",border:0,borderRadius:10,fontWeight:800,cursor:"pointer"}}>{busy ? "Activating…" : "Enable phone notifications"}</button>
    <p style={{margin:0,color:"#cbd5e1",lineHeight:1.6}}>{message}</p>
  </div>;
}
