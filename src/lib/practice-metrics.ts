import type { Question } from "./questions";
export function practiceXp(correct: number, speed: number) {
  return Math.round(correct * 15 * (0.75 + speed * 0.25));
}
export function practiceStreak(entries: { date: string }[], now = new Date()) {
  const days = new Set(entries.map((e) => new Date(e.date).toDateString()));
  const d = new Date(now);
  if (!days.has(d.toDateString())) d.setDate(d.getDate() - 1);
  let n = 0;
  while (days.has(d.toDateString())) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}
export function skillMatrix(questions: Question[], correctness: boolean[]) {
  return [
    {
      name: "Detail focus",
      detail: "Select and retain specific details",
      kinds: ["mcq", "cloze"],
    },
    {
      name: "Meaning & reasoning",
      detail: "Interpret statements and infer meaning",
      kinds: ["truefalse", "short"],
    },
    {
      name: "Association",
      detail: "Connect related information",
      kinds: ["matching"],
    },
    {
      name: "Sequence memory",
      detail: "Reconstruct the order of events",
      kinds: ["ordering"],
    },
  ].map((s) => {
    const rows = questions
      .map((q, i) => ({ q, i }))
      .filter(({ q }) => s.kinds.includes(q.kind!));
    const correct = rows.filter(({ q, i }) => correctness[i]).length;
    return {
      ...s,
      correct,
      total: rows.length,
      percent: rows.length ? Math.round((correct / rows.length) * 100) : null,
    };
  });
}
