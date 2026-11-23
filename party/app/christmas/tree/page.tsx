"use client";

import { useAskKari } from "../ask-kari";
import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, REACTIONS, api, loadToken, sendLink, type Gift, type HostGuest, type Link, type Tree } from "./api";
import "@fontsource/great-vibes/latin-400.css";
import "@fontsource/nunito-sans/latin-400.css";
import "@fontsource/nunito-sans/latin-600.css";
import "@fontsource/nunito-sans/latin-700.css";
import "@fontsource/nunito-sans/latin-800.css";
import "@fontsource/cormorant-garamond/latin-500.css";
import "@fontsource/cormorant-garamond/latin-500-italic.css";
import "@fontsource/cormorant-garamond/latin-700.css";
import "./tree.css";

/** Wrapping papers. Each is a photographed present; unknown saved values fall back to red. */
const PAPERS = [
  { id: "red", label: "Red with gold snowflakes" },
  { id: "snow", label: "Cream with gold stars and a red velvet bow" },
  { id: "green", label: "Evergreen with a gold bow" },
  { id: "plaid", label: "Tartan plaid with a cream bow" },
  { id: "gold", label: "Champagne gold with a red bow" },
  { id: "stars", label: "Midnight blue with silver stars" },
  { id: "candy", label: "Candy stripe with a green bow" },
  { id: "kraft", label: "Kraft paper with twine and pine" },
];
const giftArt = (wrap: string) => `/christmas/gift-${PAPERS.some((p) => p.id === wrap) ? wrap : "red"}.png`;
const Art = ({ wrap, className }: { wrap: string; className?: string }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img className={className} src={giftArt(wrap)} alt="" />
);

const MODE_LABEL = { everyone: "Everyone gives to everyone", secret_santa: "Secret Santa", open: "Open gifting" };
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/**
 * The rug is a composed arrangement, not a heap. Your own presents sit front and centre with a count.
 * Everyone else's are represented by at most eleven single presents in fixed places chosen so that
 * none overlap, small at the back and larger in front. A party of 600 presents looks as calm as a
 * party of six; the real number is always stated in words, and the list below has the detail.
 * Values are percentages of the rug: left, bottom, width. Listed in the order they fill.
 */
const PLACES = [
  { left: 31, bottom: 36, size: 14 }, { left: 55, bottom: 36, size: 14 },
  { left: 6, bottom: -4, size: 19 }, { left: 75, bottom: -4, size: 19 },
  { left: 10, bottom: 36, size: 14 }, { left: 76, bottom: 36, size: 14 },
  { left: 44.75, bottom: 64, size: 10.5 }, { left: 26.5, bottom: 64, size: 10.5 }, { left: 63, bottom: 64, size: 10.5 },
  { left: 8, bottom: 64, size: 10.5 }, { left: 81, bottom: 64, size: 10.5 },
];

export default function TreePage() {
  useAskKari();
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [tree, setTree] = useState<Tree | null>(null);
  const [given, setGiven] = useState<Gift[]>([]);
  const [received, setReceived] = useState<Gift[]>([]);
  const [fatal, setFatal] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);
  const wasOpened = useRef(false);

  useEffect(() => {
    setToken(loadToken());
    setReady(true);
  }, []);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const t = await api<Tree>(token, "tree");
      setTree(t);
      setGiven((await api<{ gifts: Gift[] }>(token, "myGifts")).gifts);
      if (t.party.status === "opened" && !wasOpened.current) {
        wasOpened.current = true;
        setReceived((await api<{ gifts: Gift[] }>(token, "received")).gifts);
      }
    } catch (err) {
      if (err instanceof ApiError && (err.code === "bad_token" || err.code === "no_token")) setFatal(err.message);
    }
  }, [token]);

  // The room checks in every few seconds while the tab is visible — that is what makes the opening simultaneous.
  useEffect(() => {
    if (!token) return;
    refresh();
    const timer = setInterval(() => document.visibilityState === "visible" && !editing && refresh(), 4000);
    return () => clearInterval(timer);
  }, [token, refresh, editing]);

  if (!ready) return <div className="pt" />;
  if (!token || fatal || !tree)
    return (
      <div className="pt">
        <div className="room">
          <div className="glow" />
          <div className="title"><h1 className="script">Christmas Together</h1></div>
          <div className="bar">
            <p className="say">{!token || fatal ? fatal || "Open the personal link your host sent you. It is your key to the party." : "Finding your tree…"}</p>
          </div>
        </div>
      </div>
    );

  const { party, me, guests } = tree;
  const opened = party.status === "opened";
  const recipients =
    party.exchangeMode === "secret_santa" ? (tree.assignment ? [tree.assignment] : []) : guests.filter((g) => g.id !== me.id);
  const wrappedByMe = given.filter((g) => g.status === "wrapped").length;
  const when = party.partyAt ? new Date(party.partyAt).toLocaleString([], { dateStyle: "long", timeStyle: "short" }) : null;
  const total = tree.presents.length;

  const startGift = async (recipientId: string) => {
    const { giftId } = await api<{ giftId: string }>(token, "createGift", { recipientId });
    await refresh();
    setEditing(giftId);
  };
  const draft = given.find((g) => g.status === "draft");
  const nextRecipient = recipients.find((r) => !given.some((g) => g.recipientId === r.id));
  // Nothing left to make: everyone on my list already has a present from me (open gifting always allows more).
  const allGiven = party.exchangeMode !== "open" && recipients.length > 0 && !nextRecipient && !draft;
  const toList = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  const mainAction = () =>
    draft ? setEditing(draft.id) : nextRecipient && recipients.length === 1 ? startGift(nextRecipient.id) : toList("give");

  const forMe = tree.presents.filter((p) => p.toId === me.id);
  const forOthers = tree.presents.filter((p) => p.toId !== me.id);
  // Show a varied handful: prefer one of each paper before repeating.
  const seen = new Set<string>();
  const display = [...forOthers.filter((p) => !seen.has(p.wrap) && seen.add(p.wrap)), ...forOthers].filter((p, i, all) => all.indexOf(p) === i).slice(0, PLACES.length);

  const say = opened ? "The presents are open. Yours are glowing."
    : total === 0 ? "The rug is waiting for its first present."
    : `${plural(total, "present")} under the tree${forMe.length ? ` · ${forMe.length} for you` : ""}`;

  return (
    <div className={`pt ${opened ? "opened" : ""}`}>
      <section className="room" aria-label="The Christmas living room">
        <div className="glow" />
        <header className="title">
          <h1 className="script">{party.name}</h1>
          <p className="tag">{MODE_LABEL[party.exchangeMode]}{when && <><span className="sep"> · </span><span className="when">{when}</span></>}</p>
          <p>Merry Christmas, {me.name}</p>
          {party.meetUrl && <a className="btn small quiet meet" href={party.meetUrl} target="_blank" rel="noopener noreferrer">📹 Join the call</a>}
        </header>

        <aside className="info" aria-label="Party details">
          <h2>Party details</h2>
          <p>📅 {when ?? "Date to be announced"}</p>
          <p>👥 {plural(guests.length, "guest")}</p>
          <p>🎁 {MODE_LABEL[party.exchangeMode]}</p>
        </aside>

        <div className="rug">
          {display.map((p, i) => (
            <div key={p.id} className="stack arrive" aria-hidden="true" style={{ left: `${PLACES[i].left}%`, bottom: `${PLACES[i].bottom}%`, width: `${PLACES[i].size}%`, zIndex: 100 - PLACES[i].bottom }}>
              <Art className="a" wrap={p.wrap} />
            </div>
          ))}
          {forMe.length > 0 && (
            <button className="stack arrive mine" style={{ left: "39%", bottom: "-10%", width: "22%", zIndex: 200 }}
              aria-label={`${plural(forMe.length, "present")} for you${opened ? ". Open them." : ", wrapped until the opening"}`}
              onClick={() => opened && toList("mine")}>
              {forMe[2] && <Art className="c" wrap={forMe[2].wrap} />}
              {forMe[1] && <Art className="b" wrap={forMe[1].wrap} />}
              <Art className="a" wrap={forMe[0].wrap} />
              <span className="name">For you{forMe.length > 1 ? ` · ${forMe.length}` : ""}</span>
            </button>
          )}
        </div>

        <div className="bar">
          <p className="say" aria-live="polite">{say}</p>
          <ul className="steps" aria-label="Your progress">
            <li className="done">✓ Joined</li>
            {!party.partyAt && !opened && tree.datePoll.length > 0 && (
              <li className={tree.datePoll.some((o) => o.mine) ? "done" : ""}>{tree.datePoll.some((o) => o.mine) ? "✓ Date vote in" : "📅 Vote on the date ↓"}</li>
            )}
            {party.exchangeMode === "secret_santa" && <li className={tree.assignment ? "done" : ""}>{tree.assignment ? `🤫 You drew ${tree.assignment.name}` : "Names not drawn yet"}</li>}
            <li className={wrappedByMe ? "done" : ""}>{wrappedByMe ? `✓ ${wrappedByMe} wrapped` : "Wrap a gift"}</li>
            <li className={opened ? "done" : ""}>{opened ? "✓ Opened" : "Opening together"}</li>
          </ul>
          {opened
            ? <button className="btn gold" onClick={() => toList("mine")}>🎁 Open my presents</button>
            : <button className="btn" disabled={recipients.length === 0} onClick={mainAction}>🎁 {draft ? "Finish my gift" : !wrappedByMe ? "Create my gift" : allGiven ? "See my gifts" : "Create another gift"}</button>}
        </div>
      </section>

      {party.cancelledAt && (
        <div className="banner" role="status">This party was cancelled by the host. You can still read and save what is here until {new Date(party.expiresAt).toLocaleDateString([], { dateStyle: "long" })}.</div>
      )}
      {opened && <div className="banner">🎄 The presents are open!</div>}

      <div className="below">
        {!party.partyAt && !opened && tree.datePoll.length > 0 && <DateVote token={token} tree={tree} refresh={refresh} />}

        {opened && (
          <section className="sec" id="mine">
            <h2>Your presents</h2>
            {received.length === 0 && <p className="muted">Nothing was wrapped for you this time.</p>}
            <ul className="rows">
              {received.map((g) => (
                <li key={g.id}>
                  <Art className="mini" wrap={g.wrap} />
                  <span className="grow"><span className="who">{g.title || "A present"}</span><br /><span className="muted">from {g.giverName}</span></span>
                  <button className="btn small gold" onClick={() => setViewing(g.id)}>Open</button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="sec" id="give">
          <h2>{opened ? "Presents you gave" : "Presents to give"}</h2>
          {party.exchangeMode === "secret_santa" && !tree.assignment && <p className="muted">Names have not been drawn yet. Your person will appear here, and only here.</p>}
          {party.exchangeMode === "secret_santa" && tree.assignment && !opened && <p>🤫 You drew <b>{tree.assignment.name}</b>. Nobody else can see this.</p>}
          <ul className="rows">
            {recipients.map((r) => {
              const mine = given.filter((g) => g.recipientId === r.id);
              const canAdd = !opened && (party.exchangeMode === "open" ? mine.length < 3 : mine.length === 0);
              return (
                <li key={r.id}>
                  <span className="grow who">{r.name}</span>
                  {mine.map((g) => (
                    <button key={g.id} className="btn small quiet" onClick={() => (opened && g.status === "wrapped" ? setViewing(g.id) : setEditing(g.id))}>
                      <span className={`pill ${g.status === "wrapped" ? "done" : "draft"}`}>{g.status === "wrapped" ? "Wrapped" : "Unfinished"}</span>
                      {opened && g.status === "wrapped" ? "See thanks" : "Edit"}
                    </button>
                  ))}
                  {canAdd && <button className="btn small" onClick={() => startGift(r.id)}>{mine.length ? "Add another" : "Make a present"}</button>}
                </li>
              );
            })}
          </ul>
        </section>

        {!me.isHost && <GuestExtras token={token} tree={tree} refresh={refresh} />}
        {me.isHost && <HostPanel token={token} tree={tree} refresh={refresh} />}

        <p className="foot">This party and everything in it is deleted on {new Date(party.expiresAt).toLocaleDateString([], { dateStyle: "long" })}.</p>
      </div>

      {editing && <GiftEditor token={token} giftId={editing} from={me.name} close={() => { setEditing(null); refresh(); }} />}
      {viewing && <GiftViewer token={token} giftId={viewing} me={me.id} close={() => setViewing(null)} />}
    </div>
  );
}

// ---------------------------------------------------------------- a guest's own corner: bring someone, add an email

function SendButton({ guest, partyName }: { guest: { name: string; token: string }; partyName: string }) {
  const [note, setNote] = useState("");
  return (
    <button className="btn small" onClick={async () => { const r = await sendLink(guest.name, partyName, guest.token); setNote(r === "copied" ? "Copied ✓" : r === "shared" ? "Sent ✓" : ""); }}>
      {note || "Send link"}
    </button>
  );
}

/** For one guest: have the system send their invitation (if we know how to reach them), or hand over the link yourself. */
function InviteControls({ token, guest, partyName, changed }: { token: string; guest: HostGuest; partyName: string; changed: () => Promise<void> }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const reach = [guest.email && "email", guest.phone && "text"].filter(Boolean).join(" and ");
  const act = async (fn: () => Promise<string>) => {
    setBusy(true);
    try { setNote(await fn()); await changed(); } catch (e) { setNote(e instanceof Error ? e.message : "Could not do that"); } finally { setBusy(false); }
  };
  const addContact = () => {
    const v = prompt(`Email or mobile number for ${guest.name}:`, guest.email ?? guest.phone ?? "");
    if (v !== null) act(async () => { await api(token, "setGuestContact", { guestId: guest.id, contact: v }); return v.trim() ? "Saved ✓" : "Removed"; });
  };
  return (
    <>
      {reach ? (
        <button className="btn small" disabled={busy} onClick={() => act(async () => { await api(token, "sendInvite", { guestId: guest.id }); return `Sent by ${reach} ✓`; })}>
          {guest.invitesSent ? "Send again" : "Send invitation"}
        </button>
      ) : <SendButton guest={guest} partyName={partyName} />}
      <button className="btn small quiet" disabled={busy} onClick={addContact}>{reach ? "Edit contact" : "Add email or mobile"}</button>
      {note && <span className="muted" role="status" style={{ flexBasis: "100%" }}>{note}</span>}
    </>
  );
}

function GuestExtras({ token, tree, refresh }: { token: string; tree: Tree; refresh: () => Promise<void> }) {
  const { party, me } = tree;
  const [mine, setMine] = useState<HostGuest[]>([]);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [email, setEmail] = useState(me.email ?? "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => setMine((await api<{ guests: typeof mine }>(token, "myInvites")).guests), [token]);
  useEffect(() => { load().catch(() => {}); }, [load]);
  const canBring = party.status !== "opened" && !party.namesDrawn && tree.guests.length < party.maxGuests;
  const run = async (fn: () => Promise<unknown>) => {
    setError("");
    try { await fn(); await refresh(); await load(); } catch (e) { setError(e instanceof Error ? e.message : "Something went wrong"); }
  };

  return (
    <>
      {(canBring || mine.length > 0) && (
        <section className="sec" id="bring">
          <h2>Bring someone</h2>
          <p>Is someone missing, like your husband or your sister? Add them and send them their own link.</p>
          <ul className="rows">
            {mine.map((g) => (
              <li key={g.id}>
                <span className="grow"><span className="who">{g.name}</span> <span className={`pill ${g.hasVisited ? "done" : ""}`}>{g.hasVisited ? "Has visited" : "Not yet"}</span>
                  {(g.email || g.phone) && <span className="muted" style={{ display: "block" }}>{[g.email, g.phone].filter(Boolean).join(" · ")}</span>}</span>
                <InviteControls token={token} guest={g} partyName={party.name} changed={load} />
              </li>
            ))}
          </ul>
          {canBring && (
            <form className="row" style={{ marginTop: 14 }} onSubmit={(e) => { e.preventDefault(); if (name.trim()) run(async () => { await api(token, "addGuest", { name, contact }); setName(""); setContact(""); }); }}>
              <input aria-label="Their name" className="grow inline-input" style={{ width: "auto", marginTop: 0 }} value={name} maxLength={40} placeholder="Their name" onChange={(e) => setName(e.target.value)} />
              <input aria-label="Their email or mobile (optional)" className="grow inline-input" style={{ width: "auto", marginTop: 0 }} value={contact} maxLength={200} placeholder="Email or mobile (optional)" onChange={(e) => setContact(e.target.value)} />
              <button className="btn small" type="submit">Add them</button>
            </form>
          )}
        </section>
      )}

      <section className="sec" id="email">
        <h2>Your email</h2>
        <p>Optional. Only you and {tree.guests.find((g) => g.isHost)?.name ?? "the host"} can see it. It is for news about this party and nothing else.</p>
        <form className="row" onSubmit={(e) => { e.preventDefault(); run(async () => { await api(token, "setMyEmail", { email: email.trim() }); setSaved(true); }); }}>
          <input aria-label="Your email" type="email" className="grow inline-input" style={{ width: "auto", marginTop: 0 }} value={email} maxLength={200} placeholder="you@example.com" onChange={(e) => { setEmail(e.target.value); setSaved(false); }} />
          <button className="btn small" type="submit">{saved ? "Saved ✓" : "Save"}</button>
        </form>
        {error && <div className="err" role="alert">{error}</div>}
      </section>
    </>
  );
}

// ---------------------------------------------------------------- choosing a date together

const fmtDate = (iso: string) => new Date(iso).toLocaleString([], { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" });

function DateVote({ token, tree, refresh }: { token: string; tree: Tree; refresh: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const mine = tree.datePoll.filter((o) => o.mine).map((o) => o.id);
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    try { await fn(); await refresh(); } catch (e) { setError(e instanceof Error ? e.message : "Something went wrong"); } finally { setBusy(false); }
  };
  const toggle = (id: string) => run(() => api(token, "voteDates", { optionIds: mine.includes(id) ? mine.filter((x) => x !== id) : [...mine, id] }));
  const most = Math.max(...tree.datePoll.map((o) => o.voters.length));

  return (
    <section className="sec" id="dates">
      <h2>When should we celebrate?</h2>
      <p>Tap every date you can make. You can change your answer any time before {tree.guests.find((g) => g.isHost)?.name ?? "the host"} decides.</p>
      <ul className="dates">
        {tree.datePoll.map((o) => (
          <li key={o.id} className={o.mine ? "yes" : ""}>
            <button className="pick" aria-pressed={o.mine} disabled={busy} onClick={() => toggle(o.id)}>
              <span className="box" aria-hidden="true">{o.mine ? "✓" : ""}</span>
              <span className="grow">
                <span className="who">{fmtDate(o.startsAt)}</span>
                <span className="muted">
                  {o.voters.length === 0 ? "Nobody yet" : `${o.voters.length} can come: ${o.voters.join(", ")}`}
                  {most > 0 && o.voters.length === most && tree.datePoll.length > 1 ? " ⭐" : ""}
                </span>
              </span>
            </button>
            {tree.me.isHost && (
              <button className="btn small gold" disabled={busy} onClick={() => confirm(`Set the party for ${fmtDate(o.startsAt)}?`) && run(() => api(token, "chooseDate", { optionId: o.id }))}>Choose this date</button>
            )}
          </li>
        ))}
      </ul>
      {error && <div className="err" role="alert">{error}</div>}
    </section>
  );
}

// ---------------------------------------------------------------- the wrapping table

const STEPS = ["Write", "Tuck in", "Wrap"];

function GiftEditor({ token, giftId, from, close }: { token: string; giftId: string; from: string; close: () => void }) {
  const [gift, setGift] = useState<Gift | null>(null);
  const [step, setStep] = useState(0);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = useRef<Record<string, unknown>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => setGift((await api<{ gift: Gift }>(token, "gift", { giftId })).gift), [token, giftId]);
  useEffect(() => { load().catch((e) => setError(e.message)); }, [load]);

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const content = pending.current;
    if (!Object.keys(content).length) return true;
    pending.current = {};
    setState("saving");
    try {
      await api(token, "saveGift", { giftId, content });
      setState("saved");
      setError("");
      return true;
    } catch (e) {
      pending.current = { ...content, ...pending.current }; // keep the words; retry on the next change
      setState("error");
      setError(e instanceof Error ? e.message : "Could not save");
      return false;
    }
  }, [token, giftId]);

  /** Every change saves by itself about a second after typing stops. */
  const change = (patch: Partial<Gift>) => {
    setGift((g) => (g ? { ...g, ...patch } : g));
    pending.current = { ...pending.current, ...patch };
    setState("idle");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 900);
  };
  useEffect(() => () => { flush(); }, [flush]);

  const addPhoto = async (file: File) => {
    setError("");
    if (file.size > 5 * 1024 * 1024) return setError("Each photo can be up to 5 MB.");
    setBusy(true);
    try {
      const { photoId, uploadUrl } = await api<{ photoId: string; uploadUrl: string }>(token, "photoUpload", { giftId, mime: file.type, sizeBytes: file.size });
      const put = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (!put.ok) throw new Error("The photo did not upload. Try again.");
      await api(token, "photoDone", { photoId });
      await flush();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const act = async (action: string, then?: () => void) => {
    setBusy(true);
    setError("");
    try {
      if (!(await flush())) return;
      await api(token, action, { giftId });
      if (then) then();
      else await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };
  const go = async (n: number) => { await flush(); setStep(n); };
  const setLink = (i: number, patch: Partial<Link>) => change({ links: gift!.links.map((l, j) => (j === i ? { ...l, ...patch } : l)) });

  if (!gift)
    return <div className="modal"><div className="table"><div className="body"><p>{error || "Fetching the wrapping paper…"}</p><button className="btn quiet" onClick={close}>Close</button></div></div></div>;
  const wrapped = gift.status === "wrapped";

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={`A present for ${gift.recipientName}`}>
      <div className="table">
        <div className="top">
          <Art className="gift" wrap={gift.wrap} />
          <span className="tagcard">To: {gift.recipientName} · From: {from}</span>
          <p className="saved" aria-live="polite">
            {state === "saving" ? "Saving…" : state === "saved" ? "Saved ✓" : state === "error" ? "Not saved yet" : wrapped ? "Under the tree. You can change it until the opening." : "Saves by itself as you go"}
          </p>
        </div>
        <ol className="crumbs">
          {STEPS.map((label, i) => (
            <li key={label}><button aria-current={step === i ? "step" : undefined} onClick={() => go(i)}><span className="num">{i + 1}</span>{label}</button></li>
          ))}
        </ol>

        <div className="body">
          {step === 0 && (
            <>
              <h2>Write what is inside</h2>
              <p className="lead">A letter, a memory, a poem, a promise. Say it the way you would say it.</p>
              <label className="field">Name your gift<input value={gift.title} maxLength={80} placeholder="A letter for June" onChange={(e) => change({ title: e.target.value })} /></label>
              <label className="field">Your message<textarea value={gift.message} maxLength={5000} placeholder={`Dear ${gift.recipientName},`} onChange={(e) => change({ message: e.target.value })} /></label>
            </>
          )}

          {step === 1 && (
            <>
              <h2>Tuck something in</h2>
              <p className="lead">All optional. Skip ahead if the words are the gift.</p>
              <div className="field">Photos ({gift.photos.length} of 3)<span className="hint">JPG or PNG, up to 5 MB each</span></div>
              <div className="photos">
                {gift.photos.map((p) => (
                  <div className="thumb" key={p.id}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt="" />
                    <button className="linkish" disabled={busy} onClick={async () => { await api(token, "photoRemove", { photoId: p.id }); load(); }}>Remove</button>
                  </div>
                ))}
              </div>
              {gift.photos.length < 3 && (
                <input type="file" aria-label="Add a photo" accept="image/jpeg,image/png,image/webp,image/gif" disabled={busy} style={{ marginTop: 8 }}
                  onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) addPhoto(f); }} />
              )}

              <label className="field">A promise or coupon<input value={gift.coupon} maxLength={300} placeholder="Good for one pancake breakfast, made by me" onChange={(e) => change({ coupon: e.target.value })} /></label>

              <div className="field">Links<span className="hint">A video, a song, or a gift you bought for them</span></div>
              {gift.links.map((l, i) => (
                <div className="row" key={i} style={{ marginTop: 8 }}>
                  <select aria-label="Kind of link" className="inline-input" style={{ width: "auto", marginTop: 0 }} value={l.kind} onChange={(e) => setLink(i, { kind: e.target.value })}>
                    <option value="youtube">YouTube video</option><option value="music">Music</option>
                    <option value="purchase">Gift I bought</option><option value="giftcard">Gift card</option><option value="other">Other</option>
                  </select>
                  <input aria-label="Link address" className="grow inline-input" style={{ width: "auto", marginTop: 0 }} value={l.url} placeholder="https://…" onChange={(e) => setLink(i, { url: e.target.value })} />
                  <button className="linkish" onClick={() => change({ links: gift.links.filter((_, j) => j !== i) })}>Remove</button>
                </div>
              ))}
              {gift.links.length < 5 && <button className="btn small quiet" style={{ marginTop: 10 }} onClick={() => change({ links: [...gift.links, { kind: "youtube", url: "", label: "" }] })}>＋ Add a link</button>}
              {gift.links.some((l) => l.kind === "youtube") && <p className="lead">An Unlisted YouTube video can be watched by anyone who has its link.</p>}
              {gift.links.some((l) => l.kind === "giftcard") && <p className="lead">Have the store email the gift card to your person, and link the order here. Please do not paste card numbers or PINs.</p>}
            </>
          )}

          {step === 2 && (
            <>
              <h2>Choose the paper</h2>
              <p className="lead">Nobody sees inside until the host opens every present at once.</p>
              <div className="papers">
                {PAPERS.map((w) => (
                  <button key={w.id} aria-label={w.label} aria-pressed={gift.wrap === w.id} className={gift.wrap === w.id ? "on" : ""} onClick={() => change({ wrap: w.id })}>
                    <Art wrap={w.id} />
                  </button>
                ))}
              </div>
            </>
          )}

          {error && <div className="err" role="alert">{error}</div>}

          <div className="foot2">
            {step > 0 && <button className="btn quiet" disabled={busy} onClick={() => go(step - 1)}>Back</button>}
            {step === 0 && <button className="btn" disabled={busy} onClick={() => go(1)}>Next: tuck something in</button>}
            {step === 1 && <button className="btn" disabled={busy} onClick={() => go(2)}>Next: choose the paper</button>}
            {step === 2 && (wrapped
              ? <button className="btn" disabled={busy} onClick={async () => { await flush(); close(); }}>Done</button>
              : <button className="btn" disabled={busy} onClick={() => act("wrapGift", close)}>🎁 Put it under the tree</button>)}
          </div>
          <div className="row" style={{ justifyContent: "center", marginTop: 8 }}>
            {!wrapped && <button className="linkish" disabled={busy} onClick={async () => { await flush(); close(); }}>Finish later</button>}
            {wrapped && <button className="linkish" disabled={busy} onClick={() => act("unwrapGift")}>Take it back out</button>}
            <button className="linkish" disabled={busy} onClick={() => confirm("Delete this present?") && act("deleteGift", close)}>Delete this present</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- an opened gift

type Msg = { id: string; senderId: string; senderName: string; body: string; reaction: string | null };
const LINK_LABEL: Record<string, string> = { music: "🎵 Listen", purchase: "🎁 See your gift", giftcard: "💳 Your gift card", youtube: "▶️ Watch" };

function ytId(url: string) {
  try {
    const u = new URL(url);
    const id = u.hostname === "youtu.be" ? u.pathname.slice(1) : (u.searchParams.get("v") ?? u.pathname.match(/\/(?:embed|shorts)\/([^/]+)/)?.[1]);
    return id && /^[\w-]{6,20}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

function GiftViewer({ token, giftId, me, close }: { token: string; giftId: string; me: string; close: () => void }) {
  const [gift, setGift] = useState<Gift | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  const loadThread = useCallback(async () => setMsgs((await api<{ messages: Msg[] }>(token, "thanks", { giftId })).messages), [token, giftId]);
  useEffect(() => {
    api<{ gift: Gift }>(token, "gift", { giftId }).then((r) => setGift(r.gift)).catch((e) => setError(e.message));
    loadThread().catch(() => {});
    const t = setInterval(() => loadThread().catch(() => {}), 6000);
    return () => clearInterval(t);
  }, [token, giftId, loadThread]);

  const send = async (payload: { body?: string; reaction?: string }) => {
    try {
      await api(token, "sayThanks", { giftId, ...payload });
      setText("");
      setError("");
      await loadThread();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send");
    }
  };
  const iGave = gift?.giverId === me;

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Your present">
      <div className="card reveal">
        <div className="paper">
          {!gift ? <p>{error || "Opening…"}</p> : (
            <>
              <Art className="crest" wrap={gift.wrap} />
              <p className="to">{iGave ? `Your gift to ${gift.recipientName}` : `For ${gift.recipientName}`}</p>
              <h2>{gift.title || "A present"}</h2>
              <div className="rule" />
              {gift.message && <p className="letter">{gift.message}</p>}
              <p className="sign">— {gift.giverName}</p>
              {gift.photos.length > 0 && (
                <div className="polaroids">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {gift.photos.map((p) => <img key={p.id} src={p.url} alt={`Photo from ${gift.giverName}`} />)}
                </div>
              )}
              {gift.coupon && <div className="ticket"><small>A promise</small>{gift.coupon}</div>}
              {gift.links.length > 0 && (
                <div className="extras">
                  {gift.links.map((l, i) => {
                    const id = l.kind === "youtube" ? ytId(l.url) : null;
                    return id ? (
                      <iframe key={i} title="Video" style={{ width: "100%", aspectRatio: "16/9", border: 0, borderRadius: 12 }}
                        src={`https://www.youtube-nocookie.com/embed/${id}`} allow="encrypted-media; picture-in-picture" allowFullScreen />
                    ) : (
                      <a key={i} className="btn small gold" href={l.url} target="_blank" rel="noopener noreferrer nofollow">{LINK_LABEL[l.kind] ?? "🔗 Open link"} · {new URL(l.url).hostname.replace(/^www\./, "")}</a>
                    );
                  })}
                </div>
              )}

              <div className="thanks">
                <h3>{iGave ? `Between you and ${gift.recipientName}` : `Thank ${gift.giverName}`}</h3>
                {msgs.map((m) => (
                  <div key={m.id} className={`bubble ${m.senderId === me ? "me" : ""}`}><b>{m.senderId === me ? "You" : m.senderName}</b>{m.reaction} {m.body}</div>
                ))}
                <div className="react">
                  {REACTIONS.map((r) => <button key={r} aria-label={`Send ${r}`} onClick={() => send({ reaction: r })}>{r}</button>)}
                </div>
                <form className="send" onSubmit={(e) => { e.preventDefault(); if (text.trim()) send({ body: text }); }}>
                  <input aria-label={iGave ? "Reply" : "Say thank you"} value={text} maxLength={2000} placeholder={iGave ? "Write back…" : "Say thank you…"} onChange={(e) => setText(e.target.value)} />
                  <button className="btn small" type="submit" disabled={!text.trim()}>Send</button>
                </form>
                {error && <div className="err" role="alert">{error}</div>}
              </div>
            </>
          )}
        </div>
        <button className="linkish close" onClick={close}>Close the card</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- host

function HostPanel({ token, tree, refresh }: { token: string; tree: Tree; refresh: () => Promise<void> }) {
  const { party } = tree;
  const [links, setLinks] = useState<HostGuest[]>([]);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const [toolsOpen, setToolsOpen] = useState(tree.guests.length < 2); // open for a brand-new party, tucked away after
  const [form, setForm] = useState({ name: party.name, meet_url: party.meetUrl ?? "", party_at: party.partyAt ? toLocalInput(party.partyAt) : "" });

  const loadLinks = useCallback(async () => setLinks((await api<{ guests: HostGuest[] }>(token, "guestLinks")).guests), [token]);
  useEffect(() => { loadLinks().catch(() => {}); }, [loadLinks, tree.guests.length]);

  const run = async (fn: () => Promise<unknown>) => {
    setError("");
    try {
      await fn();
      await refresh();
      await loadLinks();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    }
  };
  const linkFor = (g: HostGuest) => `${window.location.origin}/christmas/tree#t=${g.token}`;
  const locked = party.namesDrawn;
  const opened = party.status === "opened";

  return (
    <>
      {!opened && (
        <section className="moment">
          <h2>The big moment</h2>
          <p>When everyone is on the call, press this. Every present opens on every screen at once.</p>
          <button className="btn gold wide" style={{ fontSize: 22, minHeight: 64 }}
            onClick={() => confirm("Open the presents for everyone? This cannot be undone.") && run(() => api(token, "openParty"))}>🎁 Open the presents</button>
        </section>
      )}
      <details className="host" open={toolsOpen} onToggle={(e) => setToolsOpen(e.currentTarget.open)}>
        <summary>Host tools: party details and guests</summary>
        <div className="inner">
          <h3>Your party</h3>
          <label className="field">Party name<input value={form.name} maxLength={80} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label className="field">When is the party?<input type="datetime-local" value={form.party_at} disabled={opened} onChange={(e) => setForm({ ...form, party_at: e.target.value })} /></label>
          <label className="field">Your Google Meet link<span className="hint">Create the meeting in your own Google account and paste its link.</span>
            <input value={form.meet_url} placeholder="https://meet.google.com/abc-defg-hij" onChange={(e) => setForm({ ...form, meet_url: e.target.value })} /></label>
          <label className="field">Exchange type
            <select value={party.exchangeMode} disabled={locked || tree.presents.length > 0}
              onChange={(e) => run(() => api(token, "updateParty", { settings: { exchange_mode: e.target.value } }))}>
              <option value="everyone">Everyone gives to everyone</option>
              <option value="secret_santa">Secret Santa (private, random)</option>
              <option value="open">Open gifting (guests choose)</option>
            </select>
          </label>
          <div className="row" style={{ marginTop: 16 }}>
            <button className="btn small" onClick={() => run(() => api(token, "updateParty", {
              settings: { name: form.name, meet_url: form.meet_url, ...(opened ? {} : { party_at: form.party_at ? new Date(form.party_at).toISOString() : null }) },
            }))}>Save party details</button>
          </div>

          {!opened && <ProposeDates token={token} tree={tree} run={run} />}

          <h3>Guests ({tree.guests.length} of {party.maxGuests})</h3>
          <p className="muted">Each person gets a personal link. It is their key, so send one link per person. You only need a name; guests can add their own email, and can bring someone themselves.</p>
          <ul className="rows">
            {links.map((g) => (
              <li key={g.id}>
                <span className="grow"><span className="who">{g.name}</span>{g.isHost && " (you)"} <span className={`pill ${g.hasVisited ? "done" : ""}`}>{g.hasVisited ? "Has visited" : "Not yet"}</span>
                  {(g.email || g.phone || g.invitedBy) && <span className="muted" style={{ display: "block" }}>{[g.email, g.phone, g.invitedBy && `added by ${g.invitedBy}`].filter(Boolean).join(" · ")}</span>}</span>
                {!g.isHost && (
                  <>
                    <InviteControls token={token} guest={g} partyName={party.name} changed={loadLinks} />
                    <button className="btn small quiet" onClick={async () => { await navigator.clipboard.writeText(linkFor(g)); setCopied(g.id); }}>{copied === g.id ? "Copied ✓" : "Copy link"}</button>
                    {!locked && <button className="linkish" onClick={() => confirm(`Remove ${g.name}?`) && run(() => api(token, "removeGuest", { guestId: g.id }))}>Remove</button>}
                  </>
                )}
              </li>
            ))}
          </ul>
          {!locked && tree.guests.length < party.maxGuests && (
            <>
              <form className="row" style={{ marginTop: 14 }} onSubmit={(e) => { e.preventDefault(); if (name.trim()) run(async () => { await api(token, "addGuest", { name, contact }); setName(""); setContact(""); }); }}>
                <input aria-label="Guest name" className="grow inline-input" style={{ width: "auto", marginTop: 0 }} value={name} maxLength={40} placeholder="Guest's name" onChange={(e) => setName(e.target.value)} />
                <input aria-label="Email or mobile (optional)" className="grow inline-input" style={{ width: "auto", marginTop: 0 }} value={contact} maxLength={200} placeholder="Email or mobile (optional)" onChange={(e) => setContact(e.target.value)} />
                <button className="btn small" type="submit">Add guest</button>
              </form>
              <p className="muted">With an email or mobile number, we can send the invitation for you. Please add only people who expect to hear from you.</p>
            </>
          )}
          {party.exchangeMode === "secret_santa" && !locked && (
            <div style={{ marginTop: 16 }}>
              <button className="btn small gold" disabled={tree.guests.length < 3} onClick={() => confirm("Draw names now? The guest list locks afterward.") && run(() => api(token, "drawNames"))}>Draw names</button>
              <p className="muted">Needs at least 3 people. Even you will not see who drew whom.</p>
            </div>
          )}
          {party.exchangeMode === "secret_santa" && locked && <p className="muted">Names are drawn and the guest list is locked.</p>}
          {error && <div className="err" role="alert">{error}</div>}
        </div>
      </details>
    </>
  );
}

function ProposeDates({ token, tree, run }: { token: string; tree: Tree; run: (fn: () => Promise<unknown>) => Promise<void> }) {
  const existing = tree.datePoll.map((o) => toLocalInput(o.startsAt));
  const [dates, setDates] = useState<string[]>([existing[0] ?? "", existing[1] ?? "", existing[2] ?? ""]);
  const filled = dates.filter(Boolean);
  return (
    <>
      <h3>Not sure of the date? Let everyone vote</h3>
      <p className="muted">Offer up to three dates. Your guests tap the ones they can make, and you choose the winner.</p>
      {dates.map((d, i) => (
        <label className="field" key={i}>Option {i + 1}
          <input type="datetime-local" value={d} onChange={(e) => setDates(dates.map((x, j) => (j === i ? e.target.value : x)))} />
        </label>
      ))}
      <div className="row" style={{ marginTop: 16 }}>
        <button className="btn small" disabled={filled.length === 0}
          onClick={() => (!tree.party.partyAt || confirm("This replaces the date you already set with a vote. Continue?")) && run(() => api(token, "proposeDates", { dates: filled.map((x) => new Date(x).toISOString()) }))}>
          {tree.datePoll.length ? "Update the vote" : "Ask my guests"}
        </button>
      </div>
    </>
  );
}

function toLocalInput(iso: string) {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
