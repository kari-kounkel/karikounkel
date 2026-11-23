"use client";

import { useEffect, useState } from "react";
import "@fontsource/great-vibes/latin-400.css";
import "@fontsource/nunito-sans/latin-700.css";
import "@fontsource/nunito-sans/latin-800.css";
import "../tree/tree.css";

/**
 * Where a buyer lands after paying. Their checkout session id is exchanged for the host's personal
 * link as soon as the payment webhook has created the party — usually a second or two.
 */
export default function Welcome() {
  const [message, setMessage] = useState("Thank you! Setting up your tree…");
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const sessionId = new URLSearchParams(window.location.search).get("session_id") ?? "";
    let tries = 0;
    let stop = false;
    const ask = async () => {
      if (stop) return;
      tries++;
      try {
        const res = await fetch("/api/claim", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId }) });
        const data = await res.json();
        if (data.token) {
          window.location.replace(`/christmas/tree#t=${data.token}`);
          return;
        }
      } catch {
        /* keep trying */
      }
      if (tries >= 20) {
        setMessage("Your payment went through, but your tree is taking longer than usual.");
        setStuck(true);
      } else setTimeout(ask, 1500);
    };
    ask();
    return () => { stop = true; };
  }, []);

  return (
    <div className="pt">
      <div className="room">
        <div className="glow" />
        <div className="title"><h1 className="script">Christmas Together</h1></div>
        <div className="bar">
          <p className="say" role="status">{message}</p>
          {stuck && <p className="say">Refresh this page in a minute. If it still is not ready, reply to your Stripe receipt email and we will sort it out.</p>}
        </div>
      </div>
    </div>
  );
}
