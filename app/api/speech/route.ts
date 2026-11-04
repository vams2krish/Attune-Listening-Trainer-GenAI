import {
  body,
  json,
  providerError,
  reserve,
  secret,
} from "../../../lib/training-api";
export async function POST(request: Request) {
  const lock = await reserve(request, "speech");
  if (lock.denied) return lock.denied;
  try {
    const key = secret("ELEVENLABS_API_KEY");
    if (!key)
      return json({ error: "ElevenLabs speech is not configured yet." }, 503);
    const input = await body(request);
    if (
      !["en", "te", "hi"].includes(input.lang) ||
      !Array.isArray(input.inputs) ||
      input.inputs.length < 4 ||
      input.inputs.length > 30 ||
      input.inputs.some(
        (i: { text: string; voice_id: string }) =>
          typeof i.text !== "string" ||
          !i.text.trim() ||
          i.text.length > 400 ||
          typeof i.voice_id !== "string" ||
          !/^[A-Za-z0-9_-]{5,80}$/.test(i.voice_id),
      ) ||
      input.inputs.reduce(
        (n: number, i: { text: string }) => n + i.text.length,
        0,
      ) > 2000
    )
      return json(
        {
          error:
            "Use 4–30 spoken turns, at most 2,000 total characters, with a voice for each speaker.",
        },
        400,
      );
    const voices = new Set(
      input.inputs.map((i: { voice_id: string }) => i.voice_id),
    );
    if (voices.size < 2 || voices.size > 6)
      return json({ error: "Assign 2–6 distinct ElevenLabs voices." }, 400);
    const response = await fetch(
      "https://api.elevenlabs.io/v1/text-to-dialogue?output_format=mp3_44100_128",
      {
        method: "POST",
        headers: { "xi-api-key": key, "Content-Type": "application/json" },
        signal: AbortSignal.timeout(90000),
        body: JSON.stringify({
          inputs: input.inputs.map((i: { text: string; voice_id: string }) => ({
            text: i.text,
            voice_id: i.voice_id,
          })),
          model_id: "eleven_v3",
          language_code: input.lang,
        }),
      },
    );
    if (!response.ok)
      return json(
        { error: providerError(response.status, "ElevenLabs") },
        response.status === 402 ? 402 : 502,
      );
    const audio = await response.arrayBuffer();
    if (!audio.byteLength)
      return json(
        { error: "ElevenLabs returned empty audio. Please try again." },
        502,
      );
    return new Response(audio, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
        "Content-Disposition": "inline",
      },
    });
  } catch {
    return json(
      { error: "Audio generation could not finish. Please try again." },
      502,
    );
  } finally {
    lock.release();
  }
}
