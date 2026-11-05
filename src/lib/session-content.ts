export const SESSION_MINUTES = [2, 5, 10, 15] as const;
export type SessionMinutes = (typeof SESSION_MINUTES)[number];
export type SpeechInput = { text: string; voice_id: string };
export const questionCount = (minutes: number) =>
  minutes >= 15 ? 24 : minutes >= 10 ? 18 : minutes >= 5 ? 12 : 8;
function unwrapPaste(dialogue: string) {
  let text = dialogue.trim().replace(/\r?\n={3,}\s*$/u, "").trim();
  if (/^```(?:text|plaintext)?\s*\n/i.test(text) && /\n```$/.test(text))
    text = text
      .replace(/^```(?:text|plaintext)?\s*\n/i, "")
      .replace(/\n```$/, "")
      .trim();
  if (
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith("“") && text.endsWith("”"))
  )
    text = text.slice(1, -1).trim();
  return text;
}
function speakerTurn(line: string) {
  const match = line.match(/^\s*(.{1,44}?)[:：]\s*(.*)$/u);
  if (!match) return null;
  const name = match[1].replace(/^\*\*|\*\*$/g, "").trim();
  if (!/^[\p{L}][\p{L}\p{M}\p{N} ._'’\-]{0,39}$/u.test(name)) return null;
  return [name, match[2].replace(/^\*\*\s*/, "").trim()];
}
const sceneLabel =
  /^(?:scene|scenario|setting|సందర్భం|పరిస్థితి|परिस्थिति|दृश्य)[:：]\s*/iu;
export function parseConversation(dialogue: string) {
  const lines: string[][] = [],
    intro: string[] = [];
  const rows = unwrapPaste(dialogue).split(/\r?\n/);
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index].trim();
    if (!row) continue;
    const turn = speakerTurn(row);
    if (!lines.length && sceneLabel.test(row))
      intro.push(row.replace(sceneLabel, ""));
    else if (turn) lines.push(turn);
    else if (!lines.length) intro.push(row);
    else
      throw Error(
        `Line ${index + 1} needs a speaker label. Use Name: dialogue for each spoken turn; put scene-setting text before the first speaker.`,
      );
  }
  const scenario = intro.join(" ");
  if (scenario.length > 500)
    throw Error(
      "Keep the scene introduction under 500 characters, followed by named speaker turns.",
    );
  if (
    lines.length < 4 ||
    lines.length > 240 ||
    lines.some((l) => !l[1] || l[1].length > 1200) ||
    dialogue.length > 60000
  )
    throw Error(
      "Use 4–240 named turns, up to 1,200 characters per turn and 60,000 characters in total. You may add a short scene introduction first.",
    );
  const count = new Set(lines.map((l) => l[0])).size;
  if (count < 2 || count > 6) throw Error("Use 2–6 distinct named speakers.");
  return { lines, scenario };
}
export function parseDialogue(dialogue: string) {
  return parseConversation(dialogue).lines;
}
export function sceneFromDialogue(dialogue: string) {
  try {
    return parseConversation(dialogue).scenario;
  } catch {
    return "";
  }
}
export function introduceSpeakers(
  lines: string[][],
  lang: string,
  scenario = "",
) {
  const seen = new Set<string>();
  return lines.map(([name, text], i) => {
    let spoken = text;
    if (!seen.has(name)) {
      seen.add(name);
      if (!text.includes(name))
        spoken =
          (lang === "te"
            ? `నమస్కారం, నా పేరు ${name}. `
            : lang === "hi"
              ? `नमस्ते, मैं ${name} हूँ। `
              : `Hi, I'm ${name}. `) + text;
    }
    if (i === 0 && scenario.trim())
      spoken =
        (lang === "te"
          ? "సందర్భం: "
          : lang === "hi"
            ? "परिस्थिति: "
            : "The scene: ") +
        scenario.trim() +
        " " +
        spoken;
    return [name, spoken];
  });
}
export function chunkSpeech(
  inputs: SpeechInput[],
  maxCharacters = 1800,
): SpeechInput[][] {
  if (maxCharacters < 1) throw Error("Invalid audio chunk limit.");
  const chunks: SpeechInput[][] = [];
  let current: SpeechInput[] = [];
  let length = 0;
  for (const input of inputs) {
    if (input.text.length > maxCharacters)
      throw Error("A spoken turn is too long. Split it into smaller turns.");
    if (length + input.text.length > maxCharacters || current.length >= 30) {
      chunks.push(current);
      current = [];
      length = 0;
    }
    current.push(input);
    length += input.text.length;
  }
  if (current.length) chunks.push(current);
  return chunks;
}
export function estimatedSeconds(lines: string[][], lang = "en") {
  const words = lines.reduce((n, l) => n + l[1].trim().split(/\s+/u).length, 0);
  return Math.round(
    (words / (lang === "en" ? 135 : lang === "hi" ? 115 : 110)) * 60,
  );
}
export function formatDuration(seconds: number) {
  const whole = Math.round(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

export function speakerNamesFromDialogue(dialogue: string): string[] {
  return [
    ...new Set(
      unwrapPaste(dialogue)
        .split(/\r?\n/)
        .flatMap((line) => {
          if (sceneLabel.test(line.trim())) return [];
          const turn = speakerTurn(line);
          return turn ? [turn[0]] : [];
        }),
    ),
  ];
}
export function resolveSpeakerVoices(
  names: string[],
  available: string[],
  assignments: Record<string, string>,
  styles: Record<string, string> = {},
  voiceStyles: Record<string, string> = {},
): Record<string, string> {
  const compatible = (name: string, id: string) =>
    !styles[name] || voiceStyles[id] === styles[name];
  const resolved: Record<string, string> = {};
  const used = new Set(
    names
      .map((name) => assignments[name])
      .filter(
        (id) =>
          available.includes(id) &&
          names.some(
            (name) => assignments[name] === id && compatible(name, id),
          ),
      ),
  );
  for (const name of names) {
    const chosen = assignments[name];
    if (chosen && available.includes(chosen) && compatible(name, chosen))
      resolved[name] = chosen;
    else {
      const next = available.find(
        (id) => !used.has(id) && compatible(name, id),
      );
      if (next) {
        resolved[name] = next;
        used.add(next);
      }
    }
  }
  return resolved;
}
