import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../app/chatgpt-auth";
export function secret(
  name: "OPENROUTER_API_KEY" | "ELEVENLABS_API_KEY" | "OPENROUTER_MODEL",
) {
  return (
    (env as unknown as Record<string, string | undefined>)[name] ||
    process.env[name] ||
    ""
  );
}
export function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
export async function authorize(request: Request) {
  if (request.method === "POST") {
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin)
      return json({ error: "This request must come from Attune." }, 403);
  }
  if (!(await getChatGPTUser()))
    return json({ error: "Sign in to Attune to use generation." }, 401);
  return null;
}
const active = new Map<string, number>();
export async function reserve(request: Request, kind: string) {
  const denied = await authorize(request);
  if (denied) return { denied, release: () => {} };
  const user = await getChatGPTUser();
  const key = `${user!.userId}:${kind}`;
  const now = Date.now();
  if ((active.get(key) || 0) > now)
    return {
      denied: json(
        {
          error:
            "A request is already running. Please wait before trying again.",
        },
        429,
      ),
      release: () => {},
    };
  if (active.size > 1000) {
    for (const [k, v] of active) if (v < now) active.delete(k);
  }
  active.set(key, now + 800000);
  return { denied: null, release: () => active.delete(key) };
}
export async function body(request: Request) {
  if (Number(request.headers.get("content-length")) > 180000)
    throw Error("Your input is too long.");
  const text = await request.text();
  if (text.length > 180000) throw Error("Your input is too long.");
  try {
    return JSON.parse(text);
  } catch {
    throw Error("Send a valid conversation request.");
  }
}
export function providerError(status: number, name: string) {
  if (status === 401 || status === 403)
    return `${name} could not authorize this request. Check the server API key and its permissions.`;
  if (status === 402)
    return `${name} has no available credits. Add credits in your provider account to continue.`;
  if (status === 429)
    return `${name} reached a rate or credit limit. Please try again later.`;
  return `${name} could not complete the request (${status}). Please try again.`;
}
