"use client";
import { AudioLines, ArrowRight, Check } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { type Question, isAnswered } from "../lib/questions";
export function AnswerSheet({
  questions,
  answers,
  onChange,
  onSubmit,
  listening,
}: {
  questions: Question[];
  answers: string[];
  onChange: (i: number, a: string) => void;
  onSubmit: () => void;
  listening: boolean;
}) {
  const completed = questions.filter((q, i) =>
    isAnswered(q, answers[i]),
  ).length;
  function setPart(index: number, part: number, value: string) {
    const current = answers[index]?.split("|") || [];
    const next = Array.from(
      { length: questions[index].items!.length },
      (_, i) => current[i] || "",
    );
    next[part] = value;
    onChange(index, next.join("|"));
  }
  return (
    <div className="max-w-3xl">
      <div
        className="sticky top-0 z-10 border border-border bg-white/95 backdrop-blur rounded-lg px-5 py-4 mb-6 flex items-center justify-between gap-4"
        role="status"
      >
        <div className="flex gap-3 items-center">
          {listening ? (
            <AudioLines className="size-5 animate-pulse" />
          ) : (
            <Check className="size-5" />
          )}
          <div>
            <p className="text-xs font-medium">
              {listening
                ? "Listening · one pass"
                : "Audio finished · review your answers"}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {listening
                ? "Answer as the conversation unfolds. No pause or replay."
                : "Complete every question before submitting."}
            </p>
          </div>
        </div>
        <span className="text-xs text-muted-foreground tabular-nums shrink-0">
          {completed}/{questions.length}
        </span>
      </div>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!listening && completed === questions.length) onSubmit();
        }}
      >
        {questions.map((q, i) => (
          <Card key={i} className="p-6">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-3">
              {i + 1} / {questions.length} <span className="mx-2">·</span>
              {q.category}
            </p>
            <h2 className="text-sm font-medium leading-6">{q.prompt}</h2>
            {q.kind === "matching" || q.kind === "ordering" ? (
              <div className="space-y-3 mt-4">
                {q.items!.map((item, j) => (
                  <div key={item.id}>
                    <label
                      className="text-xs block mb-2 leading-5"
                      htmlFor={`answer-${i}-${j}`}
                    >
                      {q.kind === "matching"
                        ? `${j + 1}. ${item.label}`
                        : `Position ${j + 1}`}
                    </label>
                    <select
                      required
                      id={`answer-${i}-${j}`}
                      value={answers[i]?.split("|")[j] || ""}
                      onChange={(e) => setPart(i, j, e.target.value)}
                    >
                      <option value="" disabled>
                        Select an answer
                      </option>
                      {q.kind === "matching"
                        ? q.options!.map((o) => (
                            <option key={o} value={o}>
                              {o}
                            </option>
                          ))
                        : q.items!.map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.label}
                            </option>
                          ))}
                    </select>
                  </div>
                ))}
                {q.kind === "ordering" &&
                  answers[i] &&
                  !isAnswered(q, answers[i]) && (
                    <p className="text-[11px] text-muted-foreground">
                      Use each turn once.
                    </p>
                  )}
              </div>
            ) : q.options ? (
              <div className="grid sm:grid-cols-2 gap-2 mt-4">
                {q.options.map((o) => (
                  <label
                    key={o}
                    className={`flex gap-2 items-center border rounded-md p-3 text-xs cursor-pointer ${answers[i] === o ? "border-zinc-800 bg-zinc-50" : "border-border"}`}
                  >
                    <input
                      required
                      type="radio"
                      name={`question${i}`}
                      value={o}
                      checked={answers[i] === o}
                      onChange={() => onChange(i, o)}
                    />
                    {o}
                  </label>
                ))}
              </div>
            ) : (
              <div className="mt-4">
                <label className="field" htmlFor={`answer${i}`}>
                  {q.kind === "cloze" ? "Missing word" : "Your answer"}
                </label>
                <input
                  id={`answer${i}`}
                  required
                  type="text"
                  autoComplete="off"
                  value={answers[i] || ""}
                  onChange={(e) => onChange(i, e.target.value)}
                />
              </div>
            )}
          </Card>
        ))}
        <div className="flex items-center justify-between pt-3 gap-3">
          <span className="text-xs text-muted-foreground">
            {completed} of {questions.length} answered
          </span>
          <Button
            type="submit"
            disabled={listening || completed < questions.length}
          >
            {listening ? "Finish listening to submit" : "Submit all answers"}
            <ArrowRight />
          </Button>
        </div>
      </form>
    </div>
  );
}
