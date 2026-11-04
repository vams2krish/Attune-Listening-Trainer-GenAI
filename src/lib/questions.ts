export type Question = {
  kind?: "mcq" | "cloze" | "truefalse" | "matching" | "short" | "ordering";
  prompt: string;
  answer: string;
  options?: string[];
  category: string;
  explanation: string;
  items?: { id: string; label: string }[];
};
const clean = (s: string) =>
  s
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[\p{P}\p{S}]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
export function isAnswered(q: Question, a: string) {
  if (!a?.trim()) return false;
  if (q.kind === "matching" || q.kind === "ordering") {
    const values = a.split("|");
    return (
      values.length === q.items!.length &&
      values.every((v) => v.trim()) &&
      (q.kind !== "ordering" || new Set(values).size === values.length)
    );
  }
  return true;
}
export function gradeAnswer(q: Question, a: string) {
  return isAnswered(q, a) && clean(a) === clean(q.answer);
}
export function displayAnswer(q: Question, a: string) {
  if (q.kind === "ordering")
    return a
      .split("|")
      .map((id) => q.items?.find((i) => i.id === id)?.label || "Unanswered")
      .join(" → ");
  if (q.kind === "matching")
    return a
      .split("|")
      .map((v, i) => `${i + 1}. ${v || "Unanswered"}`)
      .join("; ");
  return a;
}
export function buildQuestions(lines: string[][]): Question[] {
  const speakers = [...new Set(lines.map((l) => l[0]))];
  const second = lines[1];
  const words = second[1].split(/\s+/);
  let wordIndex = words.length - 1;
  while (wordIndex > 0 && !clean(words[wordIndex])) wordIndex--;
  const word = words[wordIndex].replace(/^[\p{P}\p{S}]+|[\p{P}\p{S}]+$/gu, "");
  const cloze = words.map((w, i) => (i === wordIndex ? "_____" : w)).join(" ");
  const matching = [lines[2], lines[lines.length - 1]];
  const ordering = lines
    .slice(0, 3)
    .map((l, i) => ({ id: String(i + 1), label: `${l[0]}: ${l[1]}` }));
  return [
    {
      kind: "mcq",
      category: "Multiple choice",
      prompt: `Who says “${lines[0][1]}”?`,
      options: [...speakers, "Another speaker", "Nobody"].slice(
        0,
        Math.max(4, speakers.length),
      ),
      answer: lines[0][0],
      explanation: `${lines[0][0]} says this in the opening turn.`,
    },
    {
      kind: "cloze",
      category: "Fill in the blank",
      prompt: `Complete ${second[0]}’s sentence: “${cloze}”`,
      answer: word,
      explanation: `The missing word is “${word}”. Full sentence: ${second[1]}`,
    },
    {
      kind: "truefalse",
      category: "True / False",
      prompt: `${speakers.find((n) => n !== lines.at(-1)![0])} says: “${lines.at(-1)![1]}”`,
      options: ["True", "False"],
      answer: "False",
      explanation: `That statement is made by ${lines.at(-1)![0]}.`,
    },
    {
      kind: "matching",
      category: "Speaker matching",
      prompt: "Match each statement to the speaker you hear.",
      options: speakers,
      items: matching.map((l, i) => ({ id: String(i + 1), label: l[1] })),
      answer: matching.map((l) => l[0]).join("|"),
      explanation: matching
        .map((l, i) => `${i + 1}. ${l[0]} says “${l[1]}”`)
        .join(" "),
    },
    {
      kind: "short",
      category: "Short answer",
      prompt: "What is the name of the first person who speaks?",
      answer: lines[0][0],
      explanation: `${lines[0][0]} opens the conversation.`,
    },
    {
      kind: "ordering",
      category: "Turn sequence",
      prompt: "Put these three turns in the order you hear them.",
      items: [ordering[2], ordering[0], ordering[1]],
      answer: "1|2|3",
      explanation:
        "The opening three turns are shown in their original order in the transcript.",
    },
  ];
}
