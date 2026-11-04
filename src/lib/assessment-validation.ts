import type { Question } from "./questions";
export function validateAssessment(
  value: unknown,
  lines: string[][],
  expectedCount?: number,
  lang = "en",
): Question[] {
  if (
    !Array.isArray(value) ||
    value.length < 6 ||
    value.length > 30 ||
    (expectedCount && value.length !== expectedCount)
  )
    throw Error("The question set was incomplete. Please generate again.");
  const kinds = new Set<string>();
  const trueFalse =
    lang === "te"
      ? ["నిజం", "అబద్ధం"]
      : lang === "hi"
        ? ["सही", "गलत"]
        : ["True", "False"];
  for (const q of value) {
    if (
      !q ||
      typeof q.prompt !== "string" ||
      q.prompt.length < 10 ||
      q.prompt.length > 1200 ||
      typeof q.answer !== "string" ||
      !q.answer.trim() ||
      q.answer.length > 1000 ||
      typeof q.explanation !== "string" ||
      !q.explanation.trim() ||
      q.explanation.length > 1600 ||
      typeof q.category !== "string" ||
      !["mcq", "cloze", "truefalse", "matching", "short", "ordering"].includes(
        q.kind,
      ) ||
      !Array.isArray(q.options) ||
      q.options.some((v: unknown) => typeof v !== "string") ||
      q.options.length > 8 ||
      !Array.isArray(q.items) ||
      q.items.length > 6 ||
      !Array.isArray(q.acceptedAnswers) ||
      q.acceptedAnswers.length > 10 ||
      q.acceptedAnswers.some((v: unknown) => typeof v !== "string") ||
      !Array.isArray(q.evidence) ||
      !q.evidence.length ||
      q.evidence.some(
        (n: unknown) =>
          !Number.isInteger(n) || Number(n) < 1 || Number(n) > lines.length,
      )
    )
      throw Error(
        "The question set did not meet the practice format. Please generate again.",
      );
    if (lang !== "en") {
      const text = [
        q.prompt,
        q.category,
        q.explanation,
        ...q.options,
        ...q.items.map((i: { label: string }) => i.label),
        ...(q.kind === "ordering" ? [] : [q.answer]),
      ].join(" ");
      const script = lang === "te" ? /[\u0C00-\u0C7F]/u : /[\u0900-\u097F]/u;
      if (
        /[A-Za-z]/.test(text) ||
        !script.test(q.prompt) ||
        q.options.some((o: string) => /\p{L}/u.test(o) && !script.test(o))
      )
        throw Error(
          "The questions did not use the selected language. Please generate again.",
        );
    }
    kinds.add(q.kind);
    if (
      q.kind === "mcq" &&
      (q.options.length !== 4 ||
        !q.options.includes(q.answer) ||
        new Set(q.options).size !== 4)
    )
      throw Error(
        "A multiple-choice question was invalid. Please generate again.",
      );
    if (
      q.kind === "truefalse" &&
      (!trueFalse.includes(q.answer) ||
        q.options.join("|") !== trueFalse.join("|"))
    )
      throw Error("A true/false question was invalid. Please generate again.");
    if (q.kind === "matching" || q.kind === "ordering") {
      if (
        q.items.length < 2 ||
        q.items.some(
          (i: { id: string; label: string }) =>
            typeof i.id !== "string" ||
            !i.id ||
            typeof i.label !== "string" ||
            !i.label,
        )
      )
        throw Error("A matching or ordering question was invalid.");
      const answers = q.answer.split("|");
      if (answers.length !== q.items.length)
        throw Error("A compound answer was incomplete.");
      if (
        q.kind === "matching" &&
        answers.some((a: string) => !q.options.includes(a))
      )
        throw Error("A matching answer was invalid.");
      if (
        q.kind === "ordering" &&
        (new Set(answers).size !== answers.length ||
          new Set(q.items.map((i: { id: string }) => i.id)).size !==
            q.items.length ||
          answers.some(
            (a: string) => !q.items.some((i: { id: string }) => i.id === a),
          ))
      )
        throw Error("An ordering answer was invalid.");
    }
    if (
      /who (said|says|spoke|speaks)|name of the first|which speaker said/i.test(
        q.prompt,
      )
    )
      throw Error(
        "The question set relied on speaker guessing. Please generate again.",
      );
  }
  if (kinds.size !== 6)
    throw Error(
      "The question set did not include all six question types. Please generate again.",
    );
  return orderQuestions(
    (value as Question[]).map((q) => ({
      ...q,
      language: lang,
      localeVersion: 2,
    })),
  );
}

/** Place a question after the last transcript turn needed to answer it. */
export function orderQuestions(questions: Question[]): Question[] {
  return [...questions].sort(
    (a, b) =>
      Math.max(...(a.evidence?.length ? a.evidence : [0])) -
        Math.max(...(b.evidence?.length ? b.evidence : [0])) ||
      Math.min(...(a.evidence?.length ? a.evidence : [0])) -
        Math.min(...(b.evidence?.length ? b.evidence : [0])),
  );
}
