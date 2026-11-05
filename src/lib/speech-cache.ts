const DB = "attune-speech-v1";
const MAX_BYTES = 50 * 1024 * 1024;
const MAX_ENTRIES = 80;
function openCache(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () =>
      r.result.createObjectStore("parts", { keyPath: "key" });
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
export async function speechCacheKey(request: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode("eleven_v3:mp3_44100_128:" + request),
  );
  return Array.from(new Uint8Array(digest), (v) =>
    v.toString(16).padStart(2, "0"),
  ).join("");
}
export async function readSpeech(key: string): Promise<Blob | null> {
  try {
    const db = await openCache();
    return await new Promise((resolve) => {
      const tx = db.transaction("parts", "readonly");
      const r = tx.objectStore("parts").get(key);
      r.onsuccess = () => resolve(r.result?.blob || null);
      r.onerror = () => resolve(null);
      tx.oncomplete = () => db.close();
      tx.onabort = () => {
        db.close();
        resolve(null);
      };
    });
  } catch {
    return null;
  }
}
export async function writeSpeech(key: string, blob: Blob): Promise<boolean> {
  if (blob.size > MAX_BYTES) return false;
  try {
    const db = await openCache();
    return await new Promise((resolve) => {
      const tx = db.transaction("parts", "readwrite");
      const store = tx.objectStore("parts");
      const r = store.getAll();
      r.onsuccess = () => {
        const rows = r.result
          .filter((v) => v.key !== key)
          .sort((a, b) => a.created - b.created);
        let bytes = rows.reduce((n, v) => n + v.blob.size, 0) + blob.size;
        while (
          rows.length &&
          (bytes > MAX_BYTES || rows.length >= MAX_ENTRIES)
        ) {
          const old = rows.shift()!;
          bytes -= old.blob.size;
          store.delete(old.key);
        }
        store.put({ key, blob, created: Date.now() });
      };
      tx.oncomplete = () => {
        db.close();
        resolve(true);
      };
      tx.onabort = () => {
        db.close();
        resolve(false);
      };
      tx.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}
