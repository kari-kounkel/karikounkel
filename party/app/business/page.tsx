"use client";

import { useAskKari } from "../christmas/ask-kari";
import { useEffect, useState } from "react";
import "@fontsource/great-vibes/latin-400.css";
import "@fontsource/nunito-sans/latin-400.css";
import "@fontsource/nunito-sans/latin-600.css";
import "@fontsource/nunito-sans/latin-700.css";
import "@fontsource/nunito-sans/latin-800.css";
import { Proprietary } from "../christmas/proprietary";
import "../christmas/tree/tree.css";
import "../christmas/sales.css";

import { ON_SALE } from "@/lib/pricing";

/**
 * The door for teams and businesses. It sells the same product at the same price as the family
 * door; only the words are different. Nothing here promises anything the product does not do:
 * one party holds up to 25 people, and larger groups are told to use one party per team.
 */
const FAQ: [string, string][] = [
  ["Does anyone need an account, an app, or IT's blessing?", "No. Each person gets a personal link that opens in the browser on a phone, tablet or computer. Nothing is installed."],
  ["We use Zoom or Teams, not Google Meet. Does it still work?", "Yes. The party page has a call button that takes a Google Meet link. If your company meets somewhere else, hold the call there as you normally would and leave that box empty. Everything else works the same."],
  ["Do people have to spend money?", "No. A present can be a note of thanks, a memory from the year, a photo or a link to a song. Linking a purchased gift is optional, so nobody is put on the spot."],
  ["How private is the Secret Santa?", "Names are drawn at random by the system. Each person sees only who they drew. Nobody else can see the list, not even the person who set up the party."],
  ["We have more than 25 people. What do we do?", "One party holds up to 25 people, the organizer included. Larger companies set up one party per team or department, at the same price each. Tell us your headcount below if you would like help planning it."],
  ["Will we get a receipt?", "Yes. A receipt is emailed to the buyer after payment."],
  ["What happens to what people write?", "It stays inside your party. Everything, including photos, is permanently deleted 30 days after your party date. Copies may remain in encrypted backups for a short time (currently up to 7 days) before those are deleted too."],
  ["Can we get a refund?", "Yes: a full refund within 14 days of purchase, as long as the presents have not been opened."],
];

export default function BusinessDoor() {
  useAskKari("Christmas Together · Business");
  const offer = ON_SALE.standard;
  const [open, setOpen] = useState<boolean | null>(null);
  const [ask, setAsk] = useState({ email: "", company: "", people: "", body: "", state: "" });

  useEffect(() => {
    // The buy button only works once the site can verify payments.
    fetch("/api/health").then((r) => r.json()).then((h) => setOpen(!!h?.ok && !!h?.settings?.STRIPE_WEBHOOK_SECRET)).catch(() => setOpen(false));
  }, []);

  const cta =
    open ? <a className="btn cta" href={offer.url}>SET UP YOUR TEAM&rsquo;S TREE</a>
      : <button className="btn cta" disabled>{open === null ? "SET UP YOUR TEAM’S TREE" : "OPENING SOON"}</button>;

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setAsk((a) => ({ ...a, state: "sending" }));
    const body = `[Business enquiry] Company: ${ask.company || "not given"}. People: ${ask.people || "not given"}.\n\n${ask.body}`;
    const res = await fetch("/api/support", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: ask.email, body }) }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    setAsk((a) => (res?.ok ? { email: "", company: "", people: "", body: "", state: "sent" } : { ...a, state: data.error || "Could not send. Please try again." }));
  };

  return (
    <div className="pt sell">
      <header className="room hero">
        <div className="glow" />
        <div className="brand script">Christmas Together</div>
        <h1>The office Christmas party for a team that is not in one office.</h1>
        <p className="lede">Secret Santa without the spreadsheet. Names are drawn privately, everyone wraps a present, and they all open at the same moment on your team call.</p>
        {cta}
        <p className="fine">{"$" + offer.dollars} per party · up to 25 people · no subscription</p>
      </header>

      <main>
        <section>
          <h2>Who it is for</h2>
          <div className="trio">
            <div><h3>🏠 Remote and hybrid teams</h3><p>The people who never get the hallway, the potluck or the white elephant.</p></div>
            <div><h3>🏢 Offices in more than one place</h3><p>One celebration across every location and time zone. Each person sees the party time in their own zone.</p></div>
            <div><h3>🤝 Small businesses and their people</h3><p>Owners who want to say thank you to a crew, a board or a volunteer team in their own words.</p></div>
          </div>
        </section>

        <section>
          <h2>Secret Santa, done for you</h2>
          <p className="sub">The office favorite, with the awkward parts taken out.</p>
          <div className="santa">
            <ul>
              <li><b>The draw is private.</b> The system draws names at random. Each person sees only who they drew. Nobody else can see the list, not even the organizer.</li>
              <li><b>Nobody draws themselves</b>, and everyone gives one present and gets one.</li>
              <li><b>No budget pressure.</b> A present can be a note, a memory or a photo. Linking a purchased gift is optional.</li>
              <li><b>No shipping, no mailroom.</b> Presents wait under the tree until the organizer opens them for everyone at once.</li>
            </ul>
          </div>
          <p className="sub" style={{ marginTop: 22 }}>Prefer something else? The organizer can choose either of these instead.</p>
          <div className="trio two">
            <div><h3>🎄 Open gifting</h3><p>People choose who they give to. Good for thank-yous and shout-outs across a team.</p></div>
            <div><h3>🎁 Everyone gives to everyone</h3><p>Each person leaves something for each teammate. Best for small, close teams.</p></div>
          </div>
        </section>

        <section>
          <h2>This is the real thing, not a mock-up</h2>
          <p className="sub">Screenshots from the working product.</p>
          <div className="shots">
            {/* eslint-disable @next/next/no-img-element */}
            <figure><img src="/christmas/shots/tree.jpg" alt="A phone showing a Christmas living room with a lit tree and wrapped presents on the rug" loading="lazy" /><figcaption>Your team&rsquo;s tree<span>Presents gather as people wrap them</span></figcaption></figure>
            <figure><img src="/christmas/shots/wrap.jpg" alt="A phone showing eight wrapping papers to choose from" loading="lazy" /><figcaption>Wrap it<span>Write, tuck something in, choose the paper</span></figcaption></figure>
            <figure><img src="/christmas/shots/card.jpg" alt="A phone showing an opened present as a card with a letter" loading="lazy" /><figcaption>Open together<span>Each present opens as a card</span></figcaption></figure>
            {/* eslint-enable @next/next/no-img-element */}
          </div>
        </section>

        <section>
          <h2>How it goes</h2>
          <ol className="steps3">
            <li>One person buys the party and gets the team&rsquo;s tree in about a minute.</li>
            <li>They add teammates by name and send each one a personal link, by email or text. Not sure of the date? Offer up to three and let the team vote.</li>
            <li>Everyone wraps presents in the days before. Nobody can see inside.</li>
            <li>On the day, with the team on a call, the organizer presses one button. Every present opens on every screen at once.</li>
            <li>People read, laugh and send private thank-yous.</li>
          </ol>
        </section>

        <section>
          <h2>Simple pricing</h2>
          <div className="price">
            <div className="amount">{"$" + offer.dollars}</div>
            <p className="was">Per party. One payment. No subscription, no per-seat fee.</p>
            <ul>
              <li>One private tree for up to 25 people</li>
              <li>No accounts and nothing to install</li>
              <li>Private Secret Santa draw, or two other formats</li>
              <li>A date vote and invitations by email or text</li>
              <li>Private thank-you notes</li>
              <li>Receipt emailed to the buyer</li>
              <li>More than 25 people? One party per team</li>
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
          <h2>Planning for a larger company?</h2>
          <p className="sub">Tell us about your team and a real person will write back.</p>
          {ask.state === "sent" ? <p className="sub" role="status">Thank you. Your note is in, and we will write back by email.</p> : (
            <form className="help" onSubmit={send}>
              <label className="field">Your work email<input type="email" required value={ask.email} onChange={(e) => setAsk({ ...ask, email: e.target.value })} /></label>
              <label className="field">Company or organization<input maxLength={120} value={ask.company} onChange={(e) => setAsk({ ...ask, company: e.target.value })} /></label>
              <label className="field">About how many people?<input inputMode="numeric" maxLength={12} value={ask.people} onChange={(e) => setAsk({ ...ask, people: e.target.value })} /></label>
              <label className="field">What would you like to do?<textarea required minLength={5} maxLength={3500} style={{ minHeight: 120 }} value={ask.body} onChange={(e) => setAsk({ ...ask, body: e.target.value })} /></label>
              {ask.state && ask.state !== "sending" && <div className="err" role="alert">{ask.state}</div>}
              <button className="btn" style={{ marginTop: 16 }} disabled={ask.state === "sending"}>Send</button>
            </form>
          )}
        </section>
      </main>

      <footer>
        <p>Christmas Together is part of Party Together, by Kari Kounkel.</p>
        <p>Planning a family Christmas instead? <a href="/christmas" style={{ color: "var(--gold)" }}>See the family page</a></p>
        <p><a href="/christmas/legal" style={{ color: "var(--gold)" }}>Terms, privacy and refunds</a></p>
        <Proprietary />
      </footer>
    </div>
  );
}
