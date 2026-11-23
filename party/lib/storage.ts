/**
 * Private photo storage. Bytes never pass through our server: the browser uploads straight
 * to a one-time signed URL, and reads use short-lived signed URLs issued only after the
 * engine has authorized the viewer.
 */
export interface PhotoStore {
  /** A one-time URL the browser can PUT one file to. */
  signedUpload(path: string): Promise<string>;
  /** Actual stored size in bytes, or null if nothing was uploaded. */
  size(path: string): Promise<number | null>;
  /** A short-lived read URL. */
  signedRead(path: string, seconds: number): Promise<string>;
  remove(paths: string[]): Promise<void>;
}

const BUCKET = "gift-photos";

export function supabaseStore(): PhotoStore {
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set");
  const api = `${base}/storage/v1`;
  const headers = { Authorization: `Bearer ${key}`, apikey: key, "Content-Type": "application/json" };
  const call = async (path: string, init: RequestInit) => {
    const res = await fetch(`${api}${path}`, { ...init, headers: { ...headers, ...init.headers } });
    if (!res.ok) throw new Error(`storage ${init.method} ${path.split("?")[0]} failed: ${res.status}`);
    return res;
  };
  return {
    async signedUpload(path) {
      const res = await call(`/object/upload/sign/${BUCKET}/${path}`, { method: "POST", body: "{}" });
      return `${api}${((await res.json()) as { url: string }).url}`;
    },
    async size(path) {
      const res = await fetch(`${api}/object/info/${BUCKET}/${path}`, { headers });
      if (!res.ok) return null;
      const info = (await res.json()) as { size?: number; metadata?: { size?: number } };
      return info.size ?? info.metadata?.size ?? null;
    },
    async signedRead(path, seconds) {
      const res = await call(`/object/sign/${BUCKET}/${path}`, { method: "POST", body: JSON.stringify({ expiresIn: seconds }) });
      return `${api}${((await res.json()) as { signedURL: string }).signedURL}`;
    },
    async remove(paths) {
      for (let i = 0; i < paths.length; i += 100) {
        await call(`/object/${BUCKET}`, { method: "DELETE", body: JSON.stringify({ prefixes: paths.slice(i, i + 100) }) });
      }
    },
  };
}
