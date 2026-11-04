import { assessmentText } from "../lib/assessment-copy";
import { Check, X } from "lucide-react";
import { Card } from "./ui/card";
import { displayAnswer, gradeAnswer, type Question } from "../lib/questions";
export function ResultQuestion({
  question: q,
  answer,
  index,
  lang = "en",
}: {
  question: Question;
  answer: string;
  index: number;
  lang?: string;
}) {
  const t = assessmentText(lang);
  const correct = gradeAnswer(q, answer);
  const values = answer.split("|"),
    expected = q.answer.split("|");
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <span className="text-[11px] text-muted-foreground">
          {t("Question")} {index + 1} · {q.category}
        </span>
        <span
          className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold ${correct ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}
        >
          {correct ? <Check size={14} /> : <X size={14} />}{" "}
          {correct ? t("Correct") : t("Incorrect")}
        </span>
      </div>
      <h2 className="text-sm font-medium leading-6 mb-4">{q.prompt}</h2>
      {q.kind === "matching" || q.kind === "ordering" ? (
        <div className="space-y-3">
          {q.items!.map((item, i) => {
            const pass = values[i] === expected[i];
            const label = (v: string) =>
              q.kind === "ordering"
                ? q.items!.find((x) => x.id === v)?.label || t("No answer")
                : v || t("No answer");
            return (
              <div
                key={item.id}
                className="rounded-md border border-border p-3 text-xs leading-5"
              >
                <p className="font-medium mb-2">
                  {q.kind === "matching"
                    ? `${i + 1}. ${item.label}`
                    : `${t("Position")} ${i + 1}`}
                </p>
                <p
                  className={`flex gap-2 ${pass ? "text-emerald-800" : "text-red-800"}`}
                >
                  {pass ? (
                    <Check size={15} className="shrink-0 mt-0.5" />
                  ) : (
                    <X size={15} className="shrink-0 mt-0.5" />
                  )}
                  <span>
                    {t("Your answer")}: {label(values[i])}
                  </span>
                </p>
                {!pass && (
                  <p className="text-emerald-800 flex gap-2 mt-1">
                    <Check size={15} className="shrink-0 mt-0.5" />
                    <span>
                      {t("Correct answer")}: {label(expected[i])}
                    </span>
                  </p>
                )}
              </div>
            );
          })}
        </div>
      ) : q.options?.length ? (
        <div className="space-y-2">
          {q.options.map((option, i) => {
            const isCorrect = option === q.answer,
              selected = option === answer;
            return (
              <div
                key={option}
                className={`flex items-start gap-3 rounded-md border p-3 text-xs leading-5 ${isCorrect ? "border-emerald-200 bg-emerald-50/60" : selected ? "border-red-200 bg-red-50/60" : "border-border"}`}
              >
                <span
                  className={`mt-0.5 shrink-0 ${isCorrect ? "text-emerald-700" : selected ? "text-red-700" : "text-zinc-400"}`}
                >
                  {isCorrect ? (
                    <Check size={16} />
                  ) : selected ? (
                    <X size={16} />
                  ) : (
                    <X size={16} />
                  )}
                </span>
                <span className="flex-1">
                  <span className="text-muted-foreground mr-2">
                    {lang === "en" ? String.fromCharCode(65 + i) : i + 1}.
                  </span>
                  {option}
                </span>
                <span
                  className={`text-[10px] font-medium shrink-0 ${isCorrect ? "text-emerald-800" : selected ? "text-red-800" : "text-zinc-400"}`}
                >
                  {isCorrect
                    ? selected
                      ? `✓ ${t("Your answer")} · ${t("Correct")}`
                      : `✓ ${t("Correct answer")}`
                    : selected
                      ? `✕ ${t("Your answer")}`
                      : t("Incorrect option")}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-md border border-border p-4 text-xs space-y-2">
          <p
            className={`flex items-start gap-2 ${correct ? "text-emerald-800" : "text-red-800"}`}
          >
            {correct ? <Check size={16} /> : <X size={16} />}
            <span>
              <strong>{t("Your answer")}:</strong> {answer || t("No answer")}
            </span>
          </p>
          <p className="flex items-start gap-2 text-emerald-800">
            <Check size={16} />
            <span>
              <strong>{t("Correct answer")}:</strong>{" "}
              {displayAnswer(q, q.answer)}
            </span>
          </p>
        </div>
      )}
      <div className="mt-4 border-t border-border pt-4">
        <p className="text-xs font-medium mb-1">
          {t("Why this answer is correct")}
        </p>
        <p className="text-xs text-muted-foreground leading-6">
          {q.explanation}
        </p>
        {q.evidence?.length ? (
          <p className="text-[10px] text-muted-foreground mt-2">
            {t("Transcript evidence")}: {t("turns")} {q.evidence.join(", ")}
          </p>
        ) : null}
      </div>
    </Card>
  );
}
