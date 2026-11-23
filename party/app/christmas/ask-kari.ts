"use client";

import { useEffect } from "react";

/**
 * Loads the existing Ask Kari widget (the same script and backend every other K Co site uses).
 * Nothing about the widget is reimplemented here; its Christmas colours are CSS overrides in
 * tree.css that exist only on this site. If the script cannot load, the page works without it.
 */
export function useAskKari() {
  useEffect(() => {
    if (document.querySelector("script[data-ask-kari]")) return;
    const s = document.createElement("script");
    s.src = "https://chat.karikounkel.com/widget.js";
    s.async = true;
    s.dataset.askKari = "1";
    document.body.appendChild(s);
  }, []);
}
