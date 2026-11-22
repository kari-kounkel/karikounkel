"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, BOWS, REACTIONS, WRAPS, api, loadToken, type Gift, type HostGuest, type Link, type Tree } from "./api";
import "./tree.css";

const LIGHTS = [
  [50, 20, "#ffd166"], [42, 30, "#ef476f"], [58, 31, "#06d6a0"], [36, 44, "#ffd166"], [50, 42, "#4cc9f0"],
  [64, 45, "#ef476f"], [30, 58, "#06d6a0"], [44, 60, "#ef476f"], [57, 58, "#ffd166"], [70, 61, "#4cc9f0"],
  [22, 76, "#ffd166"], [36, 74, "#4cc9f0"], [50, 77, "#06d6a0"], [64, 74, "#ffd166"], [78, 77, "#ef476f"],
] as const;

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
        <div className="pt-wrap">
          <h1>🎄 Christmas Together</h1>
          <div className="card">
            <h2>This tree needs your invitation</h2>
            <p>{fatal || "Open the personal link your host sent you. It is your key to the party."}</p>
          </div>
        </div>
      </div>
    );
  if (!tree) return <div className="pt"><div className="pt-wrap"><h1>🎄</h1><p className="sub">Finding your tree…</p></div></div>;

  const { party, me, guests } = tree;
  const opened = party.status === "opened";
  const nameOf = (id: string | null) => guests.find((g) => g.id === id)?.name ?? "";
  const recipients =
    party.exchangeMode === "secret_santa" ? (tree.assignment ? [tree.assignment] : []) : guests.filter((g) => g.id !== me.id);

  const startGift = async (recipientId: string) => {
    const { giftId } = await api<{ giftId: string }>(token, "createGift", { recipientId });
    await refresh();
    setEditing(giftId);
  };

  return (
    <div className="pt">
      <div className="pt-wrap">
        <h1>{party.name}</h1>
        <p className="sub">
          {MODE_LABEL[party.exchangeMode]}
          {party.partyAt && ` · ${new Date(party.partyAt).toLocaleString([], { dateStyle: "full", timeStyle: "short" })}`}
        </p>
        <p className="sub">Merry Christmas, {me.name}.</p>
        {party.meetUrl && (
          <p style={{ textAlign: "center" }}>
            <a className="btn gold" href={party.meetUrl} target="_blank" rel="noopener noreferrer">Join the Google Meet</a>
          </p>
        )}

        <div className="scene" aria-hidden="true">
          <div className="tier t3" /><div className="tier t2" /><div className="tier t1" /><div className="trunk" />
          <div className="star">⭐</div>
          {LIGHTS.map(([x, y, c], i) => (
            <span key={i} className="light" style={{ left: `${x}%`, top: `${y}%`, background: c, boxShadow: `0 0 8px ${c}`, animationDelay: `${(i % 5) * 0.4}s` }} />
          ))}
        </div>
        <div className="pile">
          {tree.presents.map((p) => {
            const forMe = p.toId === me.id;
            const fromMe = p.fromId === me.id;
            const label = `Present for ${nameOf(p.toId)}${p.fromId ? ` from ${nameOf(p.fromId)}` : ""}`;
            return (
              <button
                key={p.id}
                className={`box w-${p.wrap} b-${p.bow} ${forMe || fromMe ? "mine" : ""} ${opened && forMe ? "pop" : ""}`}
                title={label}
                aria-label={label}
                onClick={() => (fromMe && !opened ? setEditing(p.id) : forMe && opened ? setViewing(p.id) : fromMe && opened ? setViewing(p.id) : undefined)}
              />
            );
          })}
        </div>
        <p className="sub">
          {tree.presents.length === 0 ? "No presents under the tree yet." : `${tree.presents.length} present${tree.presents.length === 1 ? "" : "s"} under the tree.`}
        </p>

        {opened ? (
          <div className="banner">🎁 The presents are open! Tap yours below.</div>
        ) : (
          <p className="sub">Presents stay wrapped until {guests.find((g) => g.isHost)?.name ?? "the host"} opens them for everyone at once.</p>
        )}

        {opened && (
          <div className="card">
            <h2>Your presents</h2>
            {received.length === 0 && <p className="muted">Nothing was wrapped for you this time.</p>}
            <ul className="list">
              {received.map((g) => (
                <li key={g.id}>
                  <span className={`box w-${g.wrap} b-${g.bow}`} />
                  <span className="grow"><b>{g.title || "A present"}</b><br /><span className="muted">from {g.giverName}</span></span>
                  <button className="btn small" onClick={() => setViewing(g.id)}>Open</button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="card">
          <h2>{opened ? "Presents you gave" : "Presents to give"}</h2>
          {party.exchangeMode === "secret_santa" && !tree.assignment && (
            <p className="muted">Names have not been drawn yet. Once the host draws, your person appears here — and only here.</p>
          )}
          {party.exchangeMode === "secret_santa" && tree.assignment && !opened && (
            <p>🤫 You drew <b>{tree.assignment.name}</b>. Nobody else can see this.</p>
          )}
          <ul className="list">
            {recipients.map((r) => {
              const mine = given.filter((g) => g.recipientId === r.id);
              const canAdd = !opened && (party.exchangeMode === "open" ? mine.length < 3 : mine.length === 0);
              return (
                <li key={r.id}>
                  <span className="grow"><b>{r.name}</b></span>
                  {mine.map((g) => (
                    <button key={g.id} className="btn small ghost" onClick={() => (opened && g.status === "wrapped" ? setViewing(g.id) : setEditing(g.id))}>
                      <span className={`pill ${g.status === "wrapped" ? "done" : "draft"}`}>{g.status === "wrapped" ? "Wrapped" : "Unfinished"}</span>{" "}
                      {opened && g.status === "wrapped" ? "See thanks" : "Edit"}
                    </button>
                  ))}
                  {canAdd && <button className="btn small" onClick={() => startGift(r.id)}>{mine.length ? "Add another" : "Make a present"}</button>}
                </li>
              );
            })}
          </ul>
        </div>

        {me.isHost && <HostPanel token={token} tree={tree} refresh={refresh} />}

        <p className="sub" style={{ marginTop: 28, fontSize: 13 }}>
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
      <div className="card">
        {!gift ? (
          <p>{error || "Unwrapping your draft…"}</p>
        ) : (
          <>
            <div className="row">
              <span className={`box big w-${gift.wrap} b-${gift.bow}`} />
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
                <select aria-label="Kind of link" value={l.kind} onChange={(e) => setLink(i, { kind: e.target.value })} style={{ padding: 10, borderRadius: 10 }}>
                  <option value="youtube">YouTube video</option><option value="music">Music</option>
                  <option value="purchase">Gift I bought</option><option value="giftcard">Gift card</option><option value="other">Other</option>
                </select>
                <input aria-label="Link address" className="grow" style={{ padding: 10, borderRadius: 10, border: "1.5px solid #c9c2b2" }} value={l.url} placeholder="https://…" onChange={(e) => setLink(i, { url: e.target.value })} />
                <button className="btn small ghost" onClick={() => change({ links: gift.links.filter((_, j) => j !== i) })}>Remove</button>
              </div>
            ))}
            {gift.links.length < 5 && <button className="btn small ghost" style={{ marginTop: 8 }} onClick={() => change({ links: [...gift.links, { kind: "youtube", url: "", label: "" }] })}>Add a link</button>}
            {gift.links.some((l) => l.kind === "youtube") && <p className="muted">An Unlisted YouTube video can be watched by anyone who has its link.</p>}
            {gift.links.some((l) => l.kind === "giftcard") && <p className="muted">Have the store email the gift card to your person, and link the order here. Please do not paste card numbers or PINs.</p>}

            <div className="field">Wrapping paper</div>
            <div className="swatches">
              {WRAPS.map((w) => <button key={w} aria-label={`${w} paper`} className={`box w-${w} b-${gift.bow} ${gift.wrap === w ? "on" : ""}`} style={{ cursor: "pointer" }} onClick={() => change({ wrap: w })} />)}
            </div>
            <div className="field">Bow</div>
            <div className="swatches">
              {BOWS.map((b) => <button key={b} aria-label={`${b} bow`} className={`dot b-${b} ${gift.bow === b ? "on" : ""}`} onClick={() => change({ bow: b })} />)}
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
      <div className="card gift-open">
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

            <div className="thread" style={{ marginTop: 18, borderTop: "1px solid #e3dccb", paddingTop: 12 }}>
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
      <div className="card">
        <h2>Host: your party</h2>
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
      </div>

      <div className="card">
        <h2>Host: guests ({tree.guests.length} of 25)</h2>
        <p className="muted">Each person gets a personal link. Send it however you like; it is their key, so one link per person.</p>
        <ul className="list">
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
            <input aria-label="Guest name" className="grow" style={{ padding: 10, borderRadius: 10, border: "1.5px solid #c9c2b2", fontSize: 16 }} value={name} maxLength={40} placeholder="Guest's name" onChange={(e) => setName(e.target.value)} />
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

      {!opened && (
        <div className="card" style={{ textAlign: "center" }}>
          <h2>Host: the big moment</h2>
          <p>When everyone is on the call, press this. Every present opens on every screen at once.</p>
          <button className="btn" style={{ fontSize: 20, padding: "16px 30px" }}
            onClick={() => confirm("Open the presents for everyone? This cannot be undone.") && run(() => api(token, "openParty"))}>🎁 Open the presents</button>
        </div>
      )}
    </>
  );
}

function toLocalInput(iso: string) {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
