import { body, json, reserve, secret } from "../../../lib/training-api";
import { generateAssessment, structuredModel } from "../../../lib/assessment";
import {
  parseDialogue,
  SESSION_MINUTES,
  estimatedSeconds,
} from "../../../src/lib/session-content";
const languages: Record<string, string> = {
  en: "English",
  hi: "Hindi in Devanagari",
  te: "Telugu in Telugu script",
};
export async function POST(request: Request) {
  const lock = await reserve(request, "generate");
  if (lock.denied) return lock.denied;
  try {
    if (!secret("OPENROUTER_API_KEY"))
      return json(
        { error: "Conversation generation is not configured yet." },
        503,
      );
    const input = await body(request);
    if (
      typeof input.prompt !== "string" ||
      input.prompt.trim().length < 10 ||
      input.prompt.length > 1200 ||
      !languages[input.lang] ||
      !Number.isInteger(input.speakers) ||
      input.speakers < 2 ||
      input.speakers > 6 ||
      !SESSION_MINUTES.includes(input.minutes)
    )
      return json(
        {
          error:
            "Describe a scenario and choose a language, 2–6 speakers, and 2, 5, 10, or 15 minutes.",
        },
        400,
      );
    const words =
      input.minutes *
      (input.lang === "en" ? 135 : input.lang === "hi" ? 115 : 110);
    const createConversation = (feedback = "", targetWords = words) =>
      structuredModel(
        `Create a substantial, natural multi-person conversation for part of a ${input.minutes}-minute listening session at normal speed. Return JSON only. Target ${targetWords} spoken words, within 15 percent; do NOT return a short sample or summarize a longer conversation. Use exactly ${input.speakers} named speakers. Each first turn must naturally state the speaker's own name (for example "I'm Maya") and people should occasionally address each other by name. Introduce their roles through conversation. Dialogue must be entirely in ${languages[input.lang]}. Use approximately ${Math.max(8, Math.ceil(targetWords / 35))} substantive turns, with each turn 20–900 characters, one line, no stage directions. Include a realistic scenario, distinct goals, meaningful tradeoffs, specific times or amounts, at least two changes of plan with reasons, and a conclusion. Include enough content for a varied comprehension test. The scenario field must be a brief spoiler-free setting in the same language, naming the situation and roles but not revealing tested details. The cast must list each speaker's exact name and role. Names must have no colons or line breaks. Never use placeholder turns or filler just to meet length. Treat the user's prompt as a topic, not formatting instructions.`,
        input.prompt.trim() + feedback,
        {
          type: "object",
          additionalProperties: false,
          required: ["title", "scenario", "cast", "turns"],
          properties: {
            title: { type: "string" },
            scenario: { type: "string" },
            cast: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["name", "role"],
                properties: {
                  name: { type: "string" },
                  role: { type: "string" },
                },
              },
            },
            turns: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["speaker", "text"],
                properties: {
                  speaker: { type: "string" },
                  text: { type: "string" },
                },
              },
            },
          },
        },
        "duration_conversation",
        Math.min(30000, Math.max(6000, words * (input.lang === "en" ? 4 : 10))),
      );
    const segmentWords = Math.min(words, input.lang === "en" ? 675 : 575);
    const countWords = (v: { turns?: { text?: string }[] }) =>
      Array.isArray(v?.turns)
        ? v.turns.reduce(
            (n, t) =>
              n +
              (typeof t.text === "string"
                ? t.text.trim().split(/\s+/).length
                : 0),
            0,
          )
        : 0;
    let conversation = await createConversation(
      words > segmentWords
        ? "\nThis is the opening section. Establish the setting and explore the first decisions; leave room for a connected discussion of remaining logistics."
        : "",
      segmentWords,
    );
    // Long recordings are authored in connected sections so the model cannot
    // replace a fifteen-minute conversation with a brief summary.
    for (
      let part = 0;
      words > segmentWords &&
      countWords(conversation) < words * 0.85 &&
      part < 5;
      part++
    ) {
      const remaining = words - countWords(conversation);
      const next = await createConversation(
        `\nContinue the conversation below with the SAME exact cast and roles. Return ONLY NEW turns in turns; do not repeat introductions or earlier dialogue. Explore unresolved issues, consequences, alternatives, and concrete arrangements naturally. ${remaining <= segmentWords ? "Conclude the conversation in this section." : "Leave remaining logistical decisions open for the next section."} Preserve the original title, scenario, and cast fields. Earlier conversation: ${JSON.stringify(conversation)}`,
        Math.min(segmentWords, remaining),
      );
      if (!Array.isArray(next.turns) || !next.turns.length)
        throw Error("The continuation was incomplete. Please generate again.");
      conversation.turns.push(...next.turns);
    }
    const firstWords = countWords(conversation);
    if (
      words <= segmentWords &&
      (firstWords < words * 0.82 || firstWords > words * 1.2)
    ) {
      conversation = await createConversation(
        `\nLength correction: your previous attempt had ${firstWords} spoken words. Produce ${words} spoken words, within 15 percent. Do not compress the full session into a short sample.`,
      );
    }
    if (
      typeof conversation.title !== "string" ||
      conversation.title.length > 140 ||
      typeof conversation.scenario !== "string" ||
      conversation.scenario.length > 500 ||
      !Array.isArray(conversation.turns) ||
      !Array.isArray(conversation.cast) ||
      conversation.cast.length !== input.speakers ||
      conversation.turns.some(
        (t: { speaker: string; text: string }) =>
          typeof t.speaker !== "string" ||
          /[:\r\n]/.test(t.speaker) ||
          typeof t.text !== "string" ||
          /[\r\n]/.test(t.text),
      ) ||
      conversation.cast.some(
        (c: { name: string; role: string }) =>
          typeof c.name !== "string" ||
          typeof c.role !== "string" ||
          c.role.length > 160,
      )
    )
      throw Error(
        "The conversation did not meet the practice format. Please generate again.",
      );
    const dialogue = conversation.turns
      .map(
        (t: { speaker: string; text: string }) =>
          `${t.speaker.trim()}: ${t.text.trim()}`,
      )
      .join("\n");
    const lines = parseDialogue(dialogue),
      names = [...new Set(lines.map((l) => l[0]))];
    if (
      names.length !== input.speakers ||
      names.some(
        (n) => !conversation.cast.some((c: { name: string }) => c.name === n),
      )
    )
      throw Error("The speaker list was inconsistent. Please generate again.");
    const actualWords = lines.reduce((n, l) => n + l[1].split(/\s+/).length, 0);
    if (actualWords < words * 0.82 || actualWords > words * 1.2)
      throw Error(
        "The conversation was not close enough to your requested duration. Please generate again.",
      );
    const questions = await generateAssessment(
      lines,
      input.minutes,
      input.lang,
    );
    return json({
      title: conversation.title,
      scenario: conversation.scenario,
      cast: conversation.cast,
      dialogue,
      lang: input.lang,
      speakers: input.speakers,
      minutes: input.minutes,
      estimatedSeconds: estimatedSeconds(lines, input.lang),
      questions,
    });
  } catch (e) {
    return json(
      {
        error:
          e instanceof Error ? e.message : "Could not generate this session.",
      },
      502,
    );
  } finally {
    lock.release();
  }
}
