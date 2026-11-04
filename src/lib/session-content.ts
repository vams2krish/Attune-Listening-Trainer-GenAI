export const SESSION_MINUTES = [2, 5, 10, 15] as const;
export type SessionMinutes = (typeof SESSION_MINUTES)[number];
export type SpeechInput = { text: string; voice_id: string };
export const questionCount = (minutes: number) =>
  minutes >= 15 ? 24 : minutes >= 10 ? 18 : minutes >= 5 ? 12 : 8;
export function parseDialogue(dialogue: string) {
  const lines = dialogue
    .trim()
    .split(/\r?\n/)
    .filter((l) => l.trim())
    .map((l) => {
      const i = l.indexOf(":");
      if (i < 1) throw Error("Use Speaker: dialogue on every line.");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    });
  if (
    lines.length < 4 ||
    lines.length > 240 ||
    lines.some((l) => !l[1] || l[1].length > 1200 || l[0].length > 40) ||
    dialogue.length > 60000
  )
    throw Error(
      "Use 4–240 turns, up to 1,200 characters per turn and 60,000 characters in total.",
    );
  const count = new Set(lines.map((l) => l[0])).size;
  if (count < 2 || count > 6) throw Error("Use 2–6 distinct named speakers.");
  return lines;
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
      dialogue.split(/\r?\n/).flatMap((line) => {
        const colon = line.indexOf(":");
        const name = colon > 0 ? line.slice(0, colon).trim() : "";
        return name ? [name] : [];
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
