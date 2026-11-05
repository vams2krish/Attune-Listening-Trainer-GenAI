"use client";
import { Check, Headphones, MessageCircle, Waypoints } from "lucide-react";
import { Card } from "./ui/card";
import { skillMatrix } from "../lib/practice-metrics";
import { gradeAnswer, type Question } from "../lib/questions";
export function SessionJourney({ phase }: { phase: string }) {
  const active =
    phase === "setup"
      ? 0
      : ["preparing", "ready", "countdown", "listening"].includes(phase)
        ? 1
        : 2;
  return (
    <ol className="session-journey" aria-label="Session journey">
      {(
        [
          ["Set the scene", "Choose your conversation", MessageCircle],
          ["Tune in", "Prepare, meet the cast, listen", Headphones],
          ["Connect the dots", "Answer and review", Waypoints],
        ] as const
      ).map(([title, detail, Icon], i) => (
        <li
          key={String(title)}
          aria-current={
            active === i && phase !== "results" ? "step" : undefined
          }
          className={i <= active ? "reached" : ""}
        >
          <span className="journey-node">
            {i < active || phase === "results" ? (
              <Check size={17} />
            ) : (
              <Icon size={17} />
            )}
          </span>
          <div>
            <strong>{String(title)}</strong>
            <small>
              {i < active || phase === "results" ? "Completed" : String(detail)}
            </small>
          </div>
        </li>
      ))}
    </ol>
  );
}
export function RewardInfo() {
  return (
    <details className="reward-info">
      <summary>How XP & streaks work</summary>
      <div className="text-xs leading-6 mt-3 text-muted-foreground">
        <p>
          XP = correct answers × 15 × (0.75 + speed × 0.25), rounded once. At
          1×, each correct answer earns 15 XP. Wrong answers earn 0 XP; there is
          no penalty.
        </p>
        <p className="mt-2">
          Submit one completed test each local calendar day to maintain your
          streak. Multiple tests on one day count as one day. Yesterday’s streak
          stays active until today ends; missing a full day resets it. Scores,
          XP and streaks are stored in this browser, so clearing browser data
          removes them. Repeat tests also earn XP.
        </p>
      </div>
    </details>
  );
}
export function NeuroMatrix({
  questions,
  answers,
}: {
  questions: Question[];
  answers: string[];
}) {
  const skills = skillMatrix(
    questions,
    questions.map((q, i) => gradeAnswer(q, answers[i])),
  );
  return (
    <Card className="p-6 mb-6">
      <div className="flex gap-3 items-center mb-2">
        <Waypoints size={20} />
        <h2 className="font-semibold text-sm">Neuro-Auditory Matrix</h2>
      </div>
      <p className="text-xs text-muted-foreground leading-6 mb-5">
        Your listening task map. Each tile uses your scored answers, grouped by
        question format.
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        {skills.map((s) => (
          <div key={s.name} className="matrix-tile">
            <div className="flex justify-between gap-3">
              <strong className="text-xs">{s.name}</strong>
              <span className="text-xs tabular-nums">
                {s.correct}/{s.total}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground my-2">{s.detail}</p>
            <div
              className="matrix-track"
              role="meter"
              aria-label={s.name}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={s.percent ?? 0}
            >
              <span style={{ width: `${s.percent ?? 0}%` }} />
            </div>
            <p className="text-[10px] mt-2">
              {s.percent === null
                ? "No questions in this session"
                : `${s.percent}% correct`}
            </p>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground mt-4 leading-5">
        This is practice feedback, not a clinical measure of focus or sensory
        integration. Spatial hearing is not measured by this conversation test.
      </p>
    </Card>
  );
}
