"use client";

import { useEffect, useState } from "react";
import "@fontsource/great-vibes/latin-400.css";
import "@fontsource/nunito-sans/latin-700.css";
import "@fontsource/nunito-sans/latin-800.css";
import "./tree/tree.css";

/**
 * The Christmas front door. Someone arriving with an invitation (in the link's #fragment, or one this
 * browser already holds) is taken straight to their tree. Everyone else sees a holding page until the
 * sales page is built.
 */
export default function ChristmasDoor() {
  const [waiting, setWaiting] = useState(true);
  useEffect(() => {
    const hasInvite = /[#&]t=[A-Za-z0-9_-]{20,100}/.test(window.location.hash) || !!localStorage.getItem("party-together-invite");
    if (hasInvite) window.location.replace(`/christmas/tree${window.location.hash}`);
    else setWaiting(false);
  }, []);
  return (
    <div className="pt">
      <div className="room">
        <div className="glow" />
        <div className="title">
          <h1 className="script">Christmas Together</h1>
          <p className="tag">One tree. A world of presents. Christmas together, wherever you are.</p>
        </div>
        <div className="bar">
          <p className="say">{waiting ? "Finding your tree…" : "Opening soon. If you were invited to a party, open the personal link your host sent you."}</p>
        </div>
      </div>
    </div>
  );
}
