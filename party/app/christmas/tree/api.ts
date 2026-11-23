"use client";

const KEY = "party-together-invite";

/** The invitation secret arrives in the link's #fragment (never sent to a server in a URL), then lives in this browser. */
export function loadToken(): string | null {
  const m = window.location.hash.match(/[#&]t=([A-Za-z0-9_-]{20,100})/);
  if (m) {
    localStorage.setItem(KEY, m[1]);
    history.replaceState(null, "", window.location.pathname);
    return m[1];
  }
  return localStorage.getItem(KEY);
}

export class ApiError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

export async function api<T = Record<string, unknown>>(token: string, action: string, body: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch("/api/party", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action, ...body }),
  });
  const data = await res.json().catch(() => ({ error: "Could not reach the party", code: "network" }));
  if (!res.ok) throw new ApiError(data.code ?? "error", data.error ?? "Something went wrong");
  return data as T;
}

export type Tree = {
  party: {
    name: string; theme: string; exchangeMode: "everyone" | "secret_santa" | "open"; partyAt: string | null;
    meetUrl: string | null; status: "active" | "opened"; namesDrawn: boolean; expiresAt: string;
  };
  me: { id: string; name: string; isHost: boolean };
  guests: { id: string; name: string; isHost: boolean }[];
  presents: { id: string; wrap: string; bow: string; toId: string; fromId: string | null }[];
  assignment: { id: string; name: string } | null;
  datePoll: { id: string; startsAt: string; voters: string[]; mine: boolean }[];
};
export type Link = { kind: string; url: string; label: string };
export type Gift = {
  id: string; giverId: string; giverName: string; recipientId: string; recipientName: string;
  status: "draft" | "wrapped"; wrap: string; bow: string; title: string; message: string; coupon: string;
  links: Link[]; photos: { id: string; url: string }[];
};
export type HostGuest = { id: string; name: string; isHost: boolean; hasVisited: boolean; token: string };

export const WRAPS = ["red", "green", "gold", "snow", "plaid", "stars", "candy", "kraft"];
export const BOWS = ["gold", "red", "silver", "green", "white"];
export const REACTIONS = ["❤️", "😂", "😭", "🥹", "🎉", "🙏"];
