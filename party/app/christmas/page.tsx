"use client";

import { useAskKari } from "./ask-kari";
import { useEffect, useState } from "react";
import "@fontsource/great-vibes/latin-400.css";
import "@fontsource/nunito-sans/latin-400.css";
import "@fontsource/nunito-sans/latin-600.css";
import "@fontsource/nunito-sans/latin-700.css";
import "@fontsource/nunito-sans/latin-800.css";
import "./tree/tree.css";
import "./sales.css";

import { ON_SALE } from "@/lib/pricing";

const FAQ: [string, string][] = [
  ["Do my guests need an account or an app?", "No. Each guest gets a personal link. They tap it and they are in, on a phone, tablet or computer."],
  ["How does the video call work?", "You create a Google Meet in your own Google account and paste its link into your party. Guests join the call from the party page. We never host or record your call."],
  ["Can anyone peek at a present early?", "No. What is inside a wrapped present is not sent to anyone's device until the host opens the presents. Then every present opens for everyone at the same moment."],
  ["How private is a Secret Santa?", "Names are drawn at random by the system. Each person sees only who they drew. Nobody else can see the list, not even the host."],
  ["What can a present be?", "A letter, a memory, a poem, a promise or coupon, up to three photos, a YouTube video, a song link, or a link to something you bought for them from any store."],
  ["Do people have to spend money on gifts?", "Not a cent. A letter is a complete present. Linking a purchased gift is optional."],
  ["How many people can come?", "Up to 25 people per party, the host included."],
  ["How long do we keep access?", "For 30 days after your party date. After that the party and everything in it, including photos, is permanently deleted. Copies may remain in encrypted backups for a short time (currently up to 7 days) before those are deleted too."],
  ["What about videos I link?", "Videos stay on YouTube. An Unlisted YouTube video can be watched by anyone who has its link, and deleting your party does not delete the video."],
  ["Can I get a refund?", "Yes: a full refund within 14 days of purchase, as long as the presents have not been opened. After a refund the party becomes read-only for 7 days so guests can save what they wrote, then it is deleted. Gifts that guests bought from stores are between them and the store."],
];

export default function ChristmasSales() {
  useAskKari();
  const offer = ON_SALE.standard;
  const [open, setOpen] = useState<boolean | null>(null);
  const [hasTree, setHasTree] = useState(false);
  const [help, setHelp] = useState({ email: "", body: "", state: "" });

  useEffect(() => {
    // An invitation link that landed here by mistake goes straight to its tree.
    const forward = () => { if (/[#&]t=[A-Za-z0-9_-]{20,100}/.test(window.location.hash)) window.location.replace(`/christmas/tree${window.location.hash}`); };
    forward();
    window.addEventListener("hashchange", forward);
    setHasTree(!!localStorage.getItem("party-together-invite"));
    // The buy button only works once the site can verify payments.
    fetch("/api/health").then((r) => r.json()).then((h) => setOpen(!!h?.ok && !!h?.settings?.STRIPE_WEBHOOK_SECRET)).catch(() => setOpen(false));
    return () => window.removeEventListener("hashchange", forward);
  }, []);

  const cta =
    open ? <a className="btn cta" href={offer.url}>CREATE YOUR CHRISTMAS TREE</a>
      : <button className="btn cta" disabled>{open === null ? "CREATE YOUR CHRISTMAS TREE" : "OPENING SOON"}</button>;

  const sendHelp = async (e: React.FormEvent) => {
    e.preventDefault();
    setHelp((h) => ({ ...h, state: "sending" }));
    const res = await fetch("/api/support", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: help.email, body: help.body }) }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    setHelp((h) => (res?.ok ? { email: "", body: "", state: "sent" } : { ...h, state: data.error || "Could not send. Please try again." }));
  };

  return (
    <div className="pt sell">
      <header className="room hero">
        <div className="glow" />
        <div className="brand script">Christmas Together</div>
        <h1>Christmas Together. Even When You&rsquo;re Miles Apart.</h1>
        <p className="lede">One tree. A world of presents. Open them all at the same moment, wherever everyone is.</p>
        {cta}
        <p className="fine">{"$" + offer.dollars} · one party · up to 25 people</p>
        {hasTree && <p className="fine"><a href="/christmas/tree" style={{ color: "var(--gold)" }}>Go to my tree →</a></p>}
      </header>

      <main>
        <section>
          <h2>This is the real thing, not a mock-up</h2>
          <p className="sub">Screenshots from the working product.</p>
          <div className="shots">
            {/* eslint-disable @next/next/no-img-element */}
            <figure><img src="/christmas/shots/tree.jpg" alt="A phone showing a Christmas living room with a lit tree and wrapped presents on the rug" loading="lazy" /><figcaption>Your tree<span>Presents gather as guests wrap them</span></figcaption></figure>
            <figure><img src="/christmas/shots/wrap.jpg" alt="A phone showing eight wrapping papers to choose from" loading="lazy" /><figcaption>Wrap it<span>Write, tuck something in, choose the paper</span></figcaption></figure>
            <figure><img src="/christmas/shots/card.jpg" alt="A phone showing an opened present as a card with a letter" loading="lazy" /><figcaption>Open together<span>Each present opens as a card</span></figcaption></figure>
            {/* eslint-enable @next/next/no-img-element */}
          </div>
        </section>

        <section>
          <h2>Three ways to exchange</h2>
          <p className="sub">The host picks one when setting up the party.</p>
          <div className="trio">
            <div><h3>🎁 Everyone gives to everyone</h3><p>Each person wraps something for each other person. Best for families.</p></div>
            <div><h3>🤫 Secret Santa</h3><p>Names are drawn at random and kept private. Each person gives one present.</p></div>
            <div><h3>🎄 Open gifting</h3><p>Guests choose who they give to. Good for friends and teams.</p></div>
          </div>
        </section>

        <section>
          <h2>What can go in a present</h2>
          <p className="sub">No shopping required. The words are the gift.</p>
          <ul className="gifts">
            {["A letter", "A memory", "A poem", "A promise or coupon", "Up to three photos", "A YouTube video", "A song", "A link to a gift you bought"].map((g) => <li key={g}>{g}</li>)}
          </ul>
        </section>

        <section>
          <h2>How the day goes</h2>
          <ol className="steps3">
            <li>You buy a party and get your own tree in about a minute.</li>
            <li>You add your guests by name and send each one their personal link.</li>
            <li>Everyone wraps presents in the days before. Nobody can see inside.</li>
            <li>On the day, you start a Google Meet from your own Google account and paste the link into your party.</li>
            <li>With everyone on the call, you press one button. Every present opens on every screen at once.</li>
            <li>People read, laugh, cry a little, and send thank-yous.</li>
          </ol>
        </section>

        <section>
          <h2>One price, one party</h2>
          <div className="price">
            <div className="amount">{"$" + offer.dollars}</div>
            <p className="was">One payment. No subscription.</p>
            <ul>
              <li>One private Christmas tree</li>
              <li>Up to 25 people, no accounts needed</li>
              <li>All three exchange formats</li>
              <li>Eight wrapping papers</li>
              <li>Private thank-you notes</li>
              <li>30 days of access after your party</li>
            </ul>
            {cta}
          </div>
        </section>

        <section>
          <h2>Questions</h2>
          <div className="faq">
            {FAQ.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}
          </div>
        </section>

        <section>
          <h2>Need a hand?</h2>
          <p className="sub">Send a note and a real person will write back.</p>
          {help.state === "sent" ? <p className="sub" role="status">Thank you. Your note is in.</p> : (
            <form className="help" onSubmit={sendHelp}>
              <label className="field">Your email<input type="email" required value={help.email} onChange={(e) => setHelp({ ...help, email: e.target.value })} /></label>
              <label className="field">How can we help?<textarea required minLength={5} maxLength={4000} style={{ minHeight: 120 }} value={help.body} onChange={(e) => setHelp({ ...help, body: e.target.value })} /></label>
              {help.state && help.state !== "sending" && <div className="err" role="alert">{help.state}</div>}
              <button className="btn" style={{ marginTop: 16 }} disabled={help.state === "sending"}>Send</button>
            </form>
          )}
        </section>
      </main>

      <footer>
        <p>Christmas Together is part of Party Together, by Kari Kounkel.</p>
        <p>Your party and everything in it is deleted 30 days after the celebration.</p>
        <p><a href="/christmas/legal" style={{ color: "var(--gold)" }}>Terms, privacy and refunds</a></p>
      </footer>
    </div>
  );
}
