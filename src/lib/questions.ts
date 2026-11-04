export type Question = {
  kind?: "mcq" | "cloze" | "truefalse" | "matching" | "short" | "ordering";
  prompt: string;
  answer: string;
  options?: string[];
  category: string;
  explanation: string;
  items?: { id: string; label: string }[];
  acceptedAnswers?: string[];
  evidence?: number[];
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
  return (
    isAnswered(q, a) &&
    [q.answer, ...(q.acceptedAnswers || [])].some(
      (expected) => clean(a) === clean(expected),
    )
  );
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
