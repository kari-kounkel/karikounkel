"use client";

import { useEffect, useState } from "react";
import "@fontsource/great-vibes/latin-400.css";
import "@fontsource/nunito-sans/latin-400.css";
import "@fontsource/nunito-sans/latin-600.css";
import "@fontsource/nunito-sans/latin-700.css";
import "@fontsource/nunito-sans/latin-800.css";
import "../tree/tree.css";

/**
 * The big screen: a look-only view of the room for a television that a whole room of people can see.
 * It shows the party, who is coming and the wrapped presents by their paper. It never receives a
 * message, a photo, or who a present is from or for, so nothing private can appear on it.
 * It opens at the same moment as everyone's own page; people then open their own presents on their
 * own phones.
 */
type Screen = {
  party: { name: string; theme: string; exchangeMode: "everyone" | "secret_santa" | "open"; partyAt: string | null; status: string; cancelled: boolean };
  guests: { name: string; isHost: boolean; joined: boolean }[];
  presents: string[];
};

const PAPERS = ["red", "snow", "green", "plaid", "gold", "stars", "candy", "kraft"];
const art = (wrap: string) => `/christmas/gift-${PAPERS.includes(wrap) ? wrap : "red"}.png`;
const ROOMS = ["classic", "snowy"];
const MODE_LABEL = { everyone: "Everyone gives to everyone", secret_santa: "Secret Santa", open: "Open gifting" };
/** The same calm arrangement as a guest's page: eleven fixed places, small at the back. */
const PLACES = [
  { left: 31, bottom: 36, size: 14 }, { left: 55, bottom: 36, size: 14 },
  { left: 6, bottom: -4, size: 19 }, { left: 75, bottom: -4, size: 19 },
  { left: 10, bottom: 36, size: 14 }, { left: 76, bottom: 36, size: 14 },
  { left: 44.75, bottom: 64, size: 10.5 }, { left: 26.5, bottom: 64, size: 10.5 }, { left: 63, bottom: 64, size: 10.5 },
  { left: 8, bottom: 64, size: 10.5 }, { left: 81, bottom: 64, size: 10.5 },
];

export default function BigScreen() {
  const [key, setKey] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<Screen | null>(null);
  const [fatal, setFatal] = useState("");

  useEffect(() => {
    const read = () => { setKey(/[#&]k=([0-9a-f-]{36}\.[A-Za-z0-9_-]{20,60})/.exec(window.location.hash)?.[1] ?? null); setReady(true); };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);

  // Checks in every few seconds, which is what makes the opening happen here with everyone else.
  useEffect(() => {
    if (!key) return;
    let stop = false;
    const load = async () => {
      const res = await fetch("/api/screen", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key }) }).catch(() => null);
      if (stop || !res) return;
      const data = await res.json().catch(() => null);
      if (res.ok && data) { setView(data); setFatal(""); } else if (res.status === 401) setFatal(data?.error ?? "This big-screen link is not valid");
    };
    load();
    const timer = setInterval(load, 4000);
    return () => { stop = true; clearInterval(timer); };
  }, [key]);

  if (!ready) return <div className="pt" />;
  if (!key || fatal || !view)
    return (
      <div className="pt">
        <div className="room">
          <div className="glow" />
          <div className="title"><h1 className="script">Christmas Together</h1></div>
          <div className="bar"><p className="say">{!key ? "Open the big-screen link from the host's tools." : fatal || "Finding your tree…"}</p></div>
        </div>
      </div>
    );

  const { party, guests, presents } = view;
  const opened = party.status === "opened";
  const when = party.partyAt ? new Date(party.partyAt).toLocaleString([], { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" }) : null;
  // A varied handful: one of each paper before repeating.
  const seen = new Set<string>();
  const order = [...presents.map((w, i) => ({ w, i })).filter((p) => !seen.has(p.w) && seen.add(p.w)), ...presents.map((w, i) => ({ w, i }))].filter((p, n, all) => all.findIndex((q) => q.i === p.i) === n);
  const display = order.slice(0, PLACES.length);
  const extra = order.slice(PLACES.length, PLACES.length + 3);
  const total = presents.length;
  const joined = guests.filter((g) => g.joined).length;

  return (
    <div className={`pt screen theme-${ROOMS.includes(party.theme) ? party.theme : "classic"} ${opened ? "opened" : ""}`}>
      <section className="room" aria-label="The Christmas living room">
        <div className="glow" />
        <header className="title">
          <h1 className="script">{party.name}</h1>
          <p className="tag">{MODE_LABEL[party.exchangeMode]}{when && <><span className="sep"> · </span><span className="when">{when}</span></>}</p>
        </header>

        <aside className="info" aria-label="Who is coming">
          <h2>Who is coming</h2>
          <ul className="roll">
            {guests.map((g, i) => <li key={i} className={g.joined ? "in" : ""}>{g.joined ? "✓" : "·"} {g.name}</li>)}
          </ul>
        </aside>

        <div className="rug">
          {display.map((p, i) => (
            <div key={p.i} className="stack arrive" aria-hidden="true" style={{ left: `${PLACES[i].left}%`, bottom: `${PLACES[i].bottom}%`, width: `${PLACES[i].size}%`, zIndex: 100 - PLACES[i].bottom }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="a" src={art(p.w)} alt="" />
            </div>
          ))}
          {extra.length > 0 && (
            <div className="stack arrive" aria-hidden="true" style={{ left: "39%", bottom: "-10%", width: "22%", zIndex: 200 }}>
              {/* eslint-disable @next/next/no-img-element */}
              {extra[2] && <img className="c" src={art(extra[2].w)} alt="" />}
              {extra[1] && <img className="b" src={art(extra[1].w)} alt="" />}
              <img className="a" src={art(extra[0].w)} alt="" />
              {/* eslint-enable @next/next/no-img-element */}
            </div>
          )}
        </div>

        <div className="bar">
          {opened ? (
            <>
              <p className="say big" aria-live="polite">🎁 The presents are open!</p>
              <p className="say">Look at your own phone to open yours.</p>
            </>
          ) : (
            <>
              <p className="say big" aria-live="polite">{total === 0 ? "The rug is waiting for its first present." : `${total} present${total === 1 ? "" : "s"} under the tree`}</p>
              <ul className="steps" aria-label="Party progress">
                <li className={joined === guests.length ? "done" : ""}>{joined} of {guests.length} here</li>
                <li>{party.cancelled ? "This party was cancelled" : "Opening together"}</li>
              </ul>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
