import {
  authorize,
  json,
  providerError,
  secret,
} from "../../../lib/training-api";
export async function GET(request: Request) {
  const denied = await authorize(request);
  if (denied) return denied;
  const key = secret("ELEVENLABS_API_KEY");
  if (!key)
    return json({ error: "ElevenLabs speech is not configured yet." }, 503);
  try {
    const response = await fetch(
      "https://api.elevenlabs.io/v2/voices?page_size=100",
      { headers: { "xi-api-key": key }, signal: AbortSignal.timeout(20000) },
    );
    if (!response.ok)
      return json({ error: providerError(response.status, "ElevenLabs") }, 502);
    const data = (await response.json()) as {
      voices?: {
        voice_id: string;
        name: string;
        category?: string;
        labels?: Record<string, string>;
      }[];
    };
    return json({
      voices: (data.voices || [])
        .sort(
          (a, b) =>
            (a.category === "premade" ? 0 : 1) -
            (b.category === "premade" ? 0 : 1),
        )
        .map((v) => ({
          id: v.voice_id,
          name: v.name,
          gender: ["female", "male", "neutral"].includes(v.labels?.gender || "")
            ? v.labels!.gender
            : "unknown",
          description: [v.labels?.gender, v.labels?.accent]
            .filter(Boolean)
            .join(" · "),
        })),
    });
  } catch {
    return json(
      { error: "Could not load ElevenLabs voices. Please try again." },
      502,
    );
  }
}
