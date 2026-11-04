import { authorize, json, secret } from "../../../lib/training-api";
export async function GET(request: Request) {
  const denied = await authorize(request);
  if (denied) return denied;
  return json({
    generation: !!secret("OPENROUTER_API_KEY"),
    speech: !!secret("ELEVENLABS_API_KEY"),
  });
}
