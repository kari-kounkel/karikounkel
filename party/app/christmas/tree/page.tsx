"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, REACTIONS, api, loadToken, type Gift, type HostGuest, type Link, type Tree } from "./api";
import "@fontsource/great-vibes/latin-400.css";
import "@fontsource/cormorant-garamond/latin-500.css";
import "@fontsource/cormorant-garamond/latin-500-italic.css";
import "@fontsource/cormorant-garamond/latin-700.css";
import "./tree.css";

/** Wrapping papers. Each is a photographed present; older saved values fall back to red. */
const PAPERS = [
  { id: "red", label: "Red with gold snowflakes" },
  { id: "snow", label: "Cream with gold stars and a red velvet bow" },
  { id: "green", label: "Evergreen with a gold bow" },
  { id: "plaid", label: "Tartan plaid with a cream bow" },
];
const giftArt = (wrap: string) => `/christmas/gift-${{ snow: "cream", green: "green", plaid: "plaid" }[wrap] ?? "red"}.png`;

/** Where presents sit on the rug: back rows small, front rows large, filling outward from the middle. */
const SLOTS = (() => {
  const rows = [
    { bottom: 30, size: 21, n: 5 }, { bottom: 4, size: 25, n: 4 }, { bottom: 54, size: 17, n: 6 },
    { bottom: -18, size: 28, n: 3 }, { bottom: 72, size: 14, n: 7 },
  ];
  const out: { left: number; bottom: number; size: number; z: number }[] = [];
  const longest = Math.max(...rows.map((r) => r.n));
  for (let k = 0; k < longest; k++)
    rows.forEach((r, ri) => {
      if (k >= r.n) return;
      const step = Math.min(r.size * 0.86, 100 / r.n);
      const offset = (k % 2 ? 1 : -1) * Math.ceil(k / 2) * step + (r.n % 2 ? 0 : step / 2);
      out.push({ left: 50 + offset - r.size / 2 + ((ri * 7 + k * 3) % 5) - 2, bottom: r.bottom, size: r.size, z: 100 - Math.round(r.bottom) });
    });
  return out;
})();


const MODE_LABEL = { everyone: "Everyone gives to everyone", secret_santa: "Secret Santa", open: "Open gifting" };

export default function TreePage() {
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

  // The tree checks in every few seconds while the tab is visible — that is what makes the opening simultaneous.
  useEffect(() => {
    if (!token) return;
    refresh();
    const timer = setInterval(() => document.visibilityState === "visible" && !editing && refresh(), 4000);
    return () => clearInterval(timer);
  }, [token, refresh, editing]);

  if (!ready) return <div className="pt" />;
  if (!token || fatal)
    return (
      <div className="pt">
        <div className="room"><div className="glow" />
          <div className="title"><h1 className="script">Christmas Together</h1></div>
          <div className="dock glass">
            <h2>This tree needs your invitation</h2>
            <p style={{ margin: 0, textAlign: "center" }}>{fatal || "Open the personal link your host sent you. It is your key to the party."}</p>
          </div>
        </div>
      </div>
    );
  if (!tree)
    return <div className="pt"><div className="room"><div className="glow" /><div className="title"><h1 className="script">Christmas Together</h1><p className="tag">Finding your tree…</p></div></div></div>;

  const { party, me, guests } = tree;
  const opened = party.status === "opened";
  const nameOf = (id: string | null) => guests.find((g) => g.id === id)?.name ?? "";
  const hostName = guests.find((g) => g.isHost)?.name ?? "the host";
  const recipients =
    party.exchangeMode === "secret_santa" ? (tree.assignment ? [tree.assignment] : []) : guests.filter((g) => g.id !== me.id);
  const wrappedByMe = given.filter((g) => g.status === "wrapped").length;
  const when = party.partyAt ? new Date(party.partyAt).toLocaleString([], { dateStyle: "long", timeStyle: "short" }) : null;

  const startGift = async (recipientId: string) => {
    const { giftId } = await api<{ giftId: string }>(token, "createGift", { recipientId });
    await refresh();
    setEditing(giftId);
  };
  /** The one big button: finish a draft, start the next present, or (in a big party) jump to the list. */
  const draft = given.find((g) => g.status === "draft");
  const nextRecipient = recipients.find((r) => !given.some((g) => g.recipientId === r.id));
  const createMyGift = () =>
    draft ? setEditing(draft.id) : nextRecipient && recipients.length === 1 ? startGift(nextRecipient.id)
      : document.getElementById("give")?.scrollIntoView({ behavior: "smooth" });

  // Presents that involve me come first, so they are always among the ones on the rug.
  const mineFirst = [...tree.presents].sort((x, y) => Number(y.toId === me.id || y.fromId === me.id) - Number(x.toId === me.id || x.fromId === me.id));
  const onRug = mineFirst.slice(0, SLOTS.length);

  return (
    <div className={`pt ${opened ? "opened" : ""}`}>
     <div className="stage">
      <section className="room" aria-label="The Christmas living room">
        <div className="glow" />
        <header className="title">
          <h1 className="script">{party.name}</h1>
          <p className="tag">{MODE_LABEL[party.exchangeMode]}{when && <><span className="sep"> · </span><span className="when">{when}</span></>}</p>
          <p className="hello">Merry Christmas, {me.name}</p>
          {party.meetUrl && <a className="btn meet" href={party.meetUrl} target="_blank" rel="noopener noreferrer">📹 Join the call</a>}
        </header>

        <aside className="info" aria-label="Party details">
          <h2>{party.name}</h2>
          <p>📅 {when ?? "Date to be announced"}</p>
          <p>👥 {guests.length} {guests.length === 1 ? "guest" : "guests"}</p>
          <p>🎁 {MODE_LABEL[party.exchangeMode]}</p>
        </aside>

        <div className="pile">
          {onRug.map((p, i) => {
            const slot = SLOTS[i];
            const forMe = p.toId === me.id;
            const fromMe = p.fromId === me.id;
            const label = `Present for ${nameOf(p.toId)}${p.fromId ? ` from ${nameOf(p.fromId)}` : ""}`;
            return (
              <button
                key={p.id}
                className={`present arrive ${forMe || fromMe ? "mine" : ""}`}
                style={{ left: `${slot.left}%`, bottom: `${slot.bottom}%`, width: `${slot.size}%`, zIndex: slot.z }}
                aria-label={label}
                title={label}
                onClick={() => (fromMe && !opened ? setEditing(p.id) : (forMe || fromMe) && opened ? setViewing(p.id) : undefined)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={giftArt(p.wrap)} alt="" />
                {forMe && <span className="who">For you</span>}
                {fromMe && !forMe && <span className="who">From you</span>}
              </button>
            );
          })}
        </div>
        <p className="count">
          {tree.presents.length === 0 ? "The rug is waiting for the first present" : `${tree.presents.length} ${tree.presents.length === 1 ? "present" : "presents"} under the tree`}
        </p>

      </section>
        <div className="dock glass">
          <h2>Your Party</h2>
          <ul className="steps">
            <li className="done"><span className="tick">✓</span> Join the party</li>
            {party.exchangeMode === "secret_santa" && (
              <li className={tree.assignment ? "done" : ""}><span className="tick">{tree.assignment ? "✓" : ""}</span>{tree.assignment ? `You drew ${tree.assignment.name} 🤫` : "Wait for names to be drawn"}</li>
            )}
            <li className={wrappedByMe ? "done" : ""}><span className="tick">{wrappedByMe ? "✓" : ""}</span>{wrappedByMe ? `${wrappedByMe} wrapped and under the tree` : "Create your gift"}</li>
            <li className={opened ? "done" : ""}><span className="tick">{opened ? "✓" : ""}</span>{opened ? "Presents are open!" : `${hostName} opens them for everyone at once`}</li>
          </ul>
          {opened
            ? <button className="btn gold wide" onClick={() => document.getElementById("mine")?.scrollIntoView({ behavior: "smooth" })}>🎁 Open my presents</button>
            : <button className="btn wide" disabled={recipients.length === 0} onClick={createMyGift}>🎁 {draft ? "Finish my gift" : wrappedByMe ? "Create another gift" : "Create my gift"}</button>}
        </div>
     </div>

      {opened && <div className="banner">🎄 The presents are open! Yours are glowing.</div>}

      <div className="below">
        {opened && (
          <section className="panel glass" id="mine">
            <h2>Your Presents</h2>
            {received.length === 0 && <p className="muted" style={{ textAlign: "center" }}>Nothing was wrapped for you this time.</p>}
            <ul className="rows">
              {received.map((g) => (
                <li key={g.id}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="mini" src={giftArt(g.wrap)} alt="" />
                  <span className="grow"><b>{g.title || "A present"}</b><br /><span className="muted">from {g.giverName}</span></span>
                  <button className="btn small gold" onClick={() => setViewing(g.id)}>Open</button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="panel glass" id="give">
          <h2>{opened ? "Presents You Gave" : "Presents to Give"}</h2>
          {party.exchangeMode === "secret_santa" && !tree.assignment && (
            <p className="muted" style={{ textAlign: "center" }}>Names have not been drawn yet. Your person will appear here, and only here.</p>
          )}
          {party.exchangeMode === "secret_santa" && tree.assignment && !opened && (
            <p style={{ textAlign: "center" }}>🤫 You drew <b>{tree.assignment.name}</b>. Nobody else can see this.</p>
          )}
          <ul className="rows">
            {recipients.map((r) => {
              const mine = given.filter((g) => g.recipientId === r.id);
              const canAdd = !opened && (party.exchangeMode === "open" ? mine.length < 3 : mine.length === 0);
              return (
                <li key={r.id}>
                  <span className="grow"><b>{r.name}</b></span>
                  {mine.map((g) => (
                    <button key={g.id} className="btn small ghost" onClick={() => (opened && g.status === "wrapped" ? setViewing(g.id) : setEditing(g.id))}>
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

        {me.isHost && <HostPanel token={token} tree={tree} refresh={refresh} />}

        <p className="foot">
          This party and everything in it is deleted on {new Date(party.expiresAt).toLocaleDateString([], { dateStyle: "long" })}.
        </p>
      </div>

      {editing && <GiftEditor token={token} giftId={editing} close={() => { setEditing(null); refresh(); }} />}
      {viewing && <GiftViewer token={token} giftId={viewing} me={me.id} close={() => setViewing(null)} />}
    </div>
  );
}

// ---------------------------------------------------------------- gift editor

function GiftEditor({ token, giftId, close }: { token: string; giftId: string; close: () => void }) {
  const [gift, setGift] = useState<Gift | null>(null);
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

  /** Every change is saved by itself about a second after typing stops. */
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

  const setLink = (i: number, patch: Partial<Link>) => change({ links: gift!.links.map((l, j) => (j === i ? { ...l, ...patch } : l)) });

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Make a present">
      <div className="parchment">
        {!gift ? (
          <p>{error || "Unwrapping your draft…"}</p>
        ) : (
          <>
            <div className="row">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="hero" src={giftArt(gift.wrap)} alt="" />
              <div className="grow">
                <h2>For {gift.recipientName}</h2>
                <span className="muted">
                  {state === "saving" ? "Saving…" : state === "saved" ? "Saved ✓" : state === "error" ? "Not saved yet" : gift.status === "wrapped" ? "Wrapped — you can still change it until the opening" : "Saves by itself as you go"}
                </span>
              </div>
            </div>

            <label className="field">What is it? <input value={gift.title} maxLength={80} placeholder="A letter, a memory, a poem, a coupon…" onChange={(e) => change({ title: e.target.value })} /></label>
            <label className="field">Your message <textarea value={gift.message} maxLength={5000} placeholder="Write it the way you would say it." onChange={(e) => change({ message: e.target.value })} /></label>
            <label className="field">Experience coupon (optional) <input value={gift.coupon} maxLength={300} placeholder="Good for one pancake breakfast, made by me" onChange={(e) => change({ coupon: e.target.value })} /></label>

            <div className="field">Photos ({gift.photos.length} of 3, up to 5 MB each)</div>
            <div className="photos">
              {gift.photos.map((p) => (
                <div key={p.id}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt="" />
                  <button className="btn small ghost" disabled={busy} onClick={async () => { await api(token, "photoRemove", { photoId: p.id }); load(); }}>Remove</button>
                </div>
              ))}
            </div>
            {gift.photos.length < 3 && (
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={busy} style={{ marginTop: 8 }}
                onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) addPhoto(f); }} />
            )}

            <div className="field">Links (videos, music, a gift you bought)</div>
            {gift.links.map((l, i) => (
              <div className="row" key={i} style={{ marginTop: 6 }}>
                <select aria-label="Kind of link" value={l.kind} onChange={(e) => setLink(i, { kind: e.target.value })} className="inline-input" style={{ width: "auto", marginTop: 0 }}>
                  <option value="youtube">YouTube video</option><option value="music">Music</option>
                  <option value="purchase">Gift I bought</option><option value="giftcard">Gift card</option><option value="other">Other</option>
                </select>
                <input aria-label="Link address" className="grow inline-input" style={{ width: "auto", marginTop: 0 }} value={l.url} placeholder="https://…" onChange={(e) => setLink(i, { url: e.target.value })} />
                <button className="btn small ghost" onClick={() => change({ links: gift.links.filter((_, j) => j !== i) })}>Remove</button>
              </div>
            ))}
            {gift.links.length < 5 && <button className="btn small ghost" style={{ marginTop: 8 }} onClick={() => change({ links: [...gift.links, { kind: "youtube", url: "", label: "" }] })}>Add a link</button>}
            {gift.links.some((l) => l.kind === "youtube") && <p className="muted">An Unlisted YouTube video can be watched by anyone who has its link.</p>}
            {gift.links.some((l) => l.kind === "giftcard") && <p className="muted">Have the store email the gift card to your person, and link the order here. Please do not paste card numbers or PINs.</p>}

            <div className="field">Wrapping paper</div>
            <div className="papers">
              {PAPERS.map((w) => (
                <button key={w.id} aria-label={w.label} aria-pressed={gift.wrap === w.id} className={gift.wrap === w.id ? "on" : ""} onClick={() => change({ wrap: w.id })}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={giftArt(w.id)} alt="" />
                </button>
              ))}
            </div>

            {error && <div className="err" role="alert">{error}</div>}
            <div className="row" style={{ marginTop: 18 }}>
              {gift.status === "draft"
                ? <button className="btn" disabled={busy} onClick={() => act("wrapGift", close)}>Wrap it &amp; put it under the tree</button>
                : <button className="btn ghost" disabled={busy} onClick={() => act("unwrapGift")}>Take it back out</button>}
              <button className="btn ghost" disabled={busy} onClick={async () => { await flush(); close(); }}>{gift.status === "draft" ? "Finish later" : "Done"}</button>
              <button className="btn small ghost" disabled={busy} onClick={() => confirm("Delete this present?") && act("deleteGift", close)}>Delete</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- opened gift + thank-yous

type Msg = { id: string; senderId: string; senderName: string; body: string; reaction: string | null };

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

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Present">
      <div className="parchment gift-open reveal">
        {!gift ? <p>{error || "Opening…"}</p> : (
          <>
            <h2>{gift.title || "A present"}</h2>
            <p className="muted">{gift.giverId === me ? `You gave this to ${gift.recipientName}` : `From ${gift.giverName}, with love`}</p>
            {gift.message && <p className="letter">{gift.message}</p>}
            {gift.coupon && <div className="coupon">🎟️ {gift.coupon}</div>}
            <div className="photos">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {gift.photos.map((p) => <img key={p.id} src={p.url} alt={`Photo from ${gift.giverName}`} />)}
            </div>
            {gift.links.map((l, i) => {
              const id = l.kind === "youtube" ? ytId(l.url) : null;
              return id ? (
                <iframe key={i} title="Video" style={{ width: "100%", aspectRatio: "16/9", border: 0, borderRadius: 12, marginTop: 12 }}
                  src={`https://www.youtube-nocookie.com/embed/${id}`} allow="encrypted-media; picture-in-picture" allowFullScreen />
              ) : (
                <p key={i}><a href={l.url} target="_blank" rel="noopener noreferrer nofollow">{{ music: "🎵 Listen", purchase: "🎁 Your gift", giftcard: "💳 Your gift card", youtube: "▶️ Watch" }[l.kind] ?? "🔗 Open link"}</a> <span className="muted">{new URL(l.url).hostname}</span></p>
              );
            })}

            <div className="thread" style={{ marginTop: 18, borderTop: "1px solid #b9a67c", paddingTop: 12 }}>
              <b>Just between you two</b>
              {msgs.map((m) => <p key={m.id}><b>{m.senderId === me ? "You" : m.senderName}:</b> {m.reaction} {m.body}</p>)}
              <div className="row">
                {REACTIONS.map((r) => <button key={r} className="btn small ghost" aria-label={`React ${r}`} onClick={() => send({ reaction: r })}>{r}</button>)}
              </div>
              <label className="field">{gift.giverId === me ? "Reply" : "Say thank you"}
                <textarea style={{ minHeight: 70 }} value={text} maxLength={2000} onChange={(e) => setText(e.target.value)} />
              </label>
              {error && <div className="err" role="alert">{error}</div>}
            </div>
            <div className="row" style={{ marginTop: 12 }}>
              <button className="btn" disabled={!text.trim()} onClick={() => send({ body: text })}>Send</button>
            </div>
          </>
        )}
        <div className="row" style={{ marginTop: 12 }}><button className="btn ghost" onClick={close}>Close</button></div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- host panel

function HostPanel({ token, tree, refresh }: { token: string; tree: Tree; refresh: () => Promise<void> }) {
  const { party } = tree;
  const [links, setLinks] = useState<HostGuest[]>([]);
  const [name, setName] = useState("");
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
        <section className="panel glass" style={{ textAlign: "center" }}>
          <h2>The Big Moment</h2>
          <p style={{ margin: "0 0 12px" }}>When everyone is on the call, press this. Every present opens on every screen at once.</p>
          <button className="btn gold wide" style={{ fontSize: 24, minHeight: 64 }}
            onClick={() => confirm("Open the presents for everyone? This cannot be undone.") && run(() => api(token, "openParty"))}>🎁 Open the presents</button>
          {error && <div className="err" role="alert">{error}</div>}
        </section>
      )}
      <details className="host" open={toolsOpen} onToggle={(e) => setToolsOpen(e.currentTarget.open)}>
        <summary>Host tools: party details and guests</summary>
        <div className="inner">
          <h3>Your party</h3>
        <label className="field">Party name <input value={form.name} maxLength={80} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        <label className="field">When is the party? <input type="datetime-local" value={form.party_at} disabled={opened} onChange={(e) => setForm({ ...form, party_at: e.target.value })} /></label>
        <label className="field">Your Google Meet link <input value={form.meet_url} placeholder="https://meet.google.com/abc-defg-hij" onChange={(e) => setForm({ ...form, meet_url: e.target.value })} /></label>
        <p className="muted">Create the meeting in your own Google account and paste its link here.</p>
        <label className="field">Exchange type
          <select value={party.exchangeMode} disabled={locked || tree.presents.length > 0}
            onChange={(e) => run(() => api(token, "updateParty", { settings: { exchange_mode: e.target.value } }))}>
            <option value="everyone">Everyone gives to everyone</option>
            <option value="secret_santa">Secret Santa (private, random)</option>
            <option value="open">Open gifting (guests choose)</option>
          </select>
        </label>
        <div className="row" style={{ marginTop: 14 }}>
          <button className="btn" onClick={() => run(() => api(token, "updateParty", {
            settings: { name: form.name, meet_url: form.meet_url, ...(opened ? {} : { party_at: form.party_at ? new Date(form.party_at).toISOString() : null }) },
          }))}>Save party details</button>
        </div>
        {error && <div className="err" role="alert">{error}</div>}

          <h3>Guests ({tree.guests.length} of 25)</h3>
        <p className="muted">Each person gets a personal link. Send it however you like; it is their key, so one link per person.</p>
        <ul className="rows">
          {links.map((g) => (
            <li key={g.id}>
              <span className="grow"><b>{g.name}</b>{g.isHost && " (you)"} <span className={`pill ${g.hasVisited ? "done" : ""}`}>{g.hasVisited ? "Has visited" : "Not yet"}</span></span>
              {!g.isHost && (
                <>
                  <button className="btn small" onClick={async () => { await navigator.clipboard.writeText(linkFor(g)); setCopied(g.id); }}>{copied === g.id ? "Copied ✓" : "Copy link"}</button>
                  {!locked && <button className="btn small ghost" onClick={() => confirm(`Remove ${g.name}?`) && run(() => api(token, "removeGuest", { guestId: g.id }))}>Remove</button>}
                </>
              )}
            </li>
          ))}
        </ul>
        {!locked && tree.guests.length < 25 && (
          <form className="row" style={{ marginTop: 12 }} onSubmit={(e) => { e.preventDefault(); if (name.trim()) run(async () => { await api(token, "addGuest", { name }); setName(""); }); }}>
            <input aria-label="Guest name" className="grow inline-input" style={{ width: "auto", marginTop: 0 }} value={name} maxLength={40} placeholder="Guest's name" onChange={(e) => setName(e.target.value)} />
            <button className="btn" type="submit">Add guest</button>
          </form>
        )}
        {party.exchangeMode === "secret_santa" && !locked && (
          <div style={{ marginTop: 14 }}>
            <button className="btn gold" disabled={tree.guests.length < 3} onClick={() => confirm("Draw names now? The guest list locks afterward.") && run(() => api(token, "drawNames"))}>Draw names</button>
            <p className="muted">Needs at least 3 people. Even you will not see who drew whom.</p>
          </div>
        )}
        {party.exchangeMode === "secret_santa" && locked && <p className="muted">Names are drawn and the guest list is locked.</p>}
      </div>
      </details>
    </>
  );
}

function toLocalInput(iso: string) {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
