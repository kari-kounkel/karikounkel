"use client";

import { useEffect } from "react";

declare global {
  interface Window { AskKariConfig?: { mode: "support"; site?: string; user?: string } }
}

/**
 * Loads the existing Ask Kari widget (the same script and backend every other K Co site uses) in its
 * lite "support" mode. Nothing about the widget is reimplemented or modified; its Christmas colours
 * are CSS overrides in tree.css that exist only on this site. If the script cannot load, the page
 * works without it.
 *
 * The widget needs a name and an email before it will send. When we already know them, we fill those
 * boxes in for the guest and hide them, so all they see is the box for their question. If we do not
 * know their email, that one box stays, because it is how the reply reaches them.
 *
 * Pass `ready = false` until the visitor is known, because the widget reads its settings once.
 */
export function useAskKari(site: string, user?: string | null, email?: string | null, ready = true) {
  useEffect(() => {
    if (!ready) return;
    if (!document.querySelector("script[data-ask-kari]")) {
      window.AskKariConfig = { mode: "support", site, ...(user ? { user } : {}) };
      const s = document.createElement("script");
      s.src = "https://chat.karikounkel.com/widget.js";
      s.async = true;
      s.dataset.askKari = "1";
      document.body.appendChild(s);
    }
    // The widget builds its form a moment after loading; fill it in once it exists, and keep it
    // filled if the guest adds their email later.
    let tries = 0;
    const fill = () => {
      const name = document.getElementById("ak-sn") as HTMLInputElement | null;
      const mail = document.getElementById("ak-se") as HTMLInputElement | null;
      if (!name || !mail) return ++tries < 40;
      if (user) { name.value = user; document.body.classList.add("ak-has-name"); }
      if (email) { mail.value = email; document.body.classList.add("ak-has-email"); }
      return false;
    };
    if (!fill()) return;
    const timer = setInterval(() => { if (!fill()) clearInterval(timer); }, 250);
    return () => clearInterval(timer);
  }, [site, user, email, ready]);
}
