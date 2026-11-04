import { body, json, reserve, secret } from "../../../lib/training-api";
import { generateAssessment } from "../../../lib/assessment";
import {
  parseDialogue,
  SESSION_MINUTES,
} from "../../../src/lib/session-content";
export async function POST(request: Request) {
  const lock = await reserve(request, "questions");
  if (lock.denied) return lock.denied;
  try {
    if (!secret("OPENROUTER_API_KEY"))
      return json(
        {
          error: "OpenRouter is needed to build content-based test questions.",
        },
        503,
      );
    const input = await body(request);
    if (
      typeof input.dialogue !== "string" ||
      !["en", "te", "hi"].includes(input.lang)
    )
      return json({ error: "Provide a dialogue and language." }, 400);
    const lines = parseDialogue(input.dialogue);
    const minutes = SESSION_MINUTES.includes(input.minutes) ? input.minutes : 2;
    const questions = await generateAssessment(lines, minutes, input.lang);
    return json({ questions });
  } catch (e) {
    return json(
      {
        error:
          e instanceof Error ? e.message : "Could not build the question set.",
      },
      502,
    );
  } finally {
    lock.release();
  }
}
