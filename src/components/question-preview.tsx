import type { Question } from "../lib/questions";
export function QuestionPreview({ questions }: { questions: Question[] }) {
  return (
    <details className="border border-border rounded-lg p-4 mt-5">
      <summary className="text-xs font-medium cursor-pointer">
        Test question list · {questions.length} questions ·{" "}
        {new Set(questions.map((q) => q.kind)).size} types
      </summary>
      <p className="text-[11px] text-muted-foreground mt-3">
        Review the questions before listening. Answers and explanations remain
        hidden until you submit.
      </p>
      <ol className="mt-4 space-y-4">
        {questions.map((q, i) => (
          <li key={i} className="text-xs leading-6">
            <span className="text-[10px] uppercase text-muted-foreground block">
              {i + 1}. {q.category}
            </span>
            {q.prompt}
            {q.items?.length ? (
              <ul className="mt-1 pl-3 text-muted-foreground">
                {q.items.map((item) => (
                  <li key={item.id}>• {item.label}</li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ol>
    </details>
  );
}
