"use client";
import { useEffect, useState } from "react";
import { ArrowRight, LoaderCircle, Save, Sparkles, Dices } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import type { Question } from "../lib/questions";
import {
  parseDialogue,
  speakerNamesFromDialogue,
  SESSION_MINUTES,
  formatDuration,
  type SessionMinutes,
} from "../lib/session-content";
import { randomConversationPrompt } from "../lib/random-prompts";
import { QuestionPreview } from "./question-preview";
export type Draft = {
  id: string;
  title: string;
  dialogue: string;
  lang: "en" | "hi" | "te";
  speakers: number;
  createdAt: string;
  minutes?: SessionMinutes;
  voiceStyles?: Record<string, string>;
  questions?: Question[];
  scenario?: string;
  cast?: { name: string; role: string; voiceStyle?: string }[];
};
export function loadDrafts(): Draft[] {
  try {
    const v = JSON.parse(localStorage.getItem("attune-drafts") || "[]");
    return Array.isArray(v)
      ? v.filter(
          (d) =>
            d &&
            typeof d.dialogue === "string" &&
            typeof d.title === "string" &&
            ["en", "hi", "te"].includes(d.lang) &&
            d.speakers >= 2 &&
            d.speakers <= 6,
        )
      : [];
  } catch {
    return [];
  }
}
export function saveDraft(draft: Omit<Draft, "id" | "createdAt">) {
  if (!draft.dialogue.trim())
    throw Error("Write or generate a conversation first.");
  const drafts = loadDrafts();
  const existing = drafts.find(
    (d) => d.dialogue === draft.dialogue && d.lang === draft.lang,
  );
  if (existing) {
    localStorage.setItem(
      "attune-drafts",
      JSON.stringify(
        drafts.map((d) =>
          d.id === existing.id ? { ...existing, ...draft } : d,
        ),
      ),
    );
    return;
  }
  localStorage.setItem(
    "attune-drafts",
    JSON.stringify(
      [
        {
          ...draft,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        },
        ...drafts,
      ].slice(0, 100),
    ),
  );
}
export function ConversationStudio({
  lang,
  speakers,
  onLanguage,
  onSpeakers,
  onUse,
  onSpeakerNames,
  onCast,
  ready,
}: {
  lang: Draft["lang"];
  speakers: number;
  onLanguage: (l: Draft["lang"]) => void;
  onSpeakers: (n: number) => void;
  onUse: (d: Omit<Draft, "id" | "createdAt">) => void;
  onSpeakerNames: (names: string[]) => void;
  onCast: (cast: NonNullable<Draft["cast"]>) => void;
  ready: boolean;
}) {
  const [randomIndex, setRandomIndex] = useState(-1);
  const [promptNotice, setPromptNotice] = useState("");
  const [prompt, setPrompt] = useState(""),
    [minutes, setMinutes] = useState<SessionMinutes>(2),
    [busy, setBusy] = useState(false),
    [title, setTitle] = useState(""),
    [dialogue, setDialogue] = useState(""),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false),
    [resultLang, setResultLang] = useState(lang),
    [resultSpeakers, setResultSpeakers] = useState(speakers),
    [resultMinutes, setResultMinutes] = useState<SessionMinutes>(2),
    [questions, setQuestions] = useState<Question[]>([]),
    [scene, setScene] = useState(""),
    [cast, setCast] = useState<
      { name: string; role: string; voiceStyle?: string }[]
    >([]),
    [estimate, setEstimate] = useState(0);
  useEffect(() => {
    onSpeakerNames(speakerNamesFromDialogue(dialogue));
  }, [dialogue, onSpeakerNames]);
  useEffect(() => {
    onCast(cast);
  }, [cast, onCast]);
  async function generate() {
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const r = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, lang, speakers, minutes }),
      });
      const d = (await r.json()) as Omit<Draft, "id" | "createdAt"> & {
        error?: string;
        estimatedSeconds?: number;
      };
      if (!r.ok)
        throw Error(d.error || "Could not generate your conversation.");
      setTitle(d.title);
      setDialogue(d.dialogue);
      setResultLang(d.lang);
      setResultSpeakers(d.speakers);
      setResultMinutes(d.minutes || minutes);
      setQuestions(d.questions || []);
      setScene(d.scenario || "");
      setCast(d.cast || []);
      setEstimate(d.estimatedSeconds || 0);
      try {
        saveDraft(d);
        setSaved(true);
      } catch {
        setError(
          "Conversation generated, but browser storage is unavailable. Keep this page open to use it.",
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed.");
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (!dialogue.trim()) return;
    const timer = window.setTimeout(() => {
      try {
        if (
          new Set(parseDialogue(dialogue).map((l) => l[0])).size !==
          resultSpeakers
        )
          return;
      } catch {
        return;
      }
      try {
        saveDraft({
          title: title.trim() || "Generated conversation",
          dialogue,
          lang: resultLang,
          speakers: resultSpeakers,
          minutes: resultMinutes,
          questions,
          scenario: scene,
          cast,
        });
        setSaved(true);
      } catch {
        setError("Automatic saving is unavailable. Check browser storage.");
      }
    }, 900);
    return () => clearTimeout(timer);
  }, [
    title,
    dialogue,
    resultLang,
    resultSpeakers,
    resultMinutes,
    questions,
    scene,
    cast,
  ]);
  function save() {
    try {
      saveDraft({
        title: title.trim() || "Generated conversation",
        dialogue,
        lang: resultLang,
        speakers: resultSpeakers,
        minutes: resultMinutes,
        questions,
        scenario: scene,
        cast,
      });
      setSaved(true);
      setError("");
    } catch {
      setError(
        "Could not save this conversation. Check browser storage and try again.",
      );
    }
  }
  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
        <label className="text-xs font-medium" htmlFor="conversation-prompt">
          Describe the conversation
        </label>
        <Button
          variant="outline"
          size="sm"
          type="button"
          disabled={busy}
          className="random-prompt-button"
          onClick={() => {
            const next = randomConversationPrompt(lang, speakers, randomIndex);
            setPrompt(next.text);
            setRandomIndex(next.index);
            setPromptNotice(
              lang === "te"
                ? "కొత్త ఆలోచన సిద్ధం. మార్చుకోవచ్చు లేదా సంభాషణ రూపొందించవచ్చు."
                : lang === "hi"
                  ? "नया विचार तैयार है। बदलाव करें या बातचीत बनाएँ।"
                  : "Fresh idea, ready to make your own.",
            );
          }}
        >
          <Dices />
          Random prompt
        </Button>
      </div>
      <textarea
        id="conversation-prompt"
        maxLength={1200}
        value={prompt}
        disabled={busy}
        onChange={(e) => {
          setPrompt(e.target.value);
          setPromptNotice("");
        }}
        placeholder="Three friends planning a trip to Hyderabad. They compare train times, agree on a budget, and change the meeting place."
      />
      <p
        role="status"
        className="text-[10px] text-muted-foreground mt-2 min-h-4"
      >
        {promptNotice ||
          "Choose a situation, topic, and the details you want to practice. Random ideas are free to shuffle."}
      </p>
      <div className="grid sm:grid-cols-3 gap-3 mt-5">
        <div>
          <label className="field" htmlFor="generate-language">
            Language
          </label>
          <select
            disabled={busy}
            id="generate-language"
            value={lang}
            onChange={(e) => onLanguage(e.target.value as Draft["lang"])}
          >
            <option value="en">English</option>
            <option value="te">Telugu</option>
            <option value="hi">Hindi</option>
          </select>
        </div>
        <div>
          <label className="field" htmlFor="generate-speakers">
            Speakers
          </label>
          <select
            disabled={busy}
            id="generate-speakers"
            value={speakers}
            onChange={(e) => onSpeakers(+e.target.value)}
          >
            {[2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="field" htmlFor="generate-length">
            Session duration
          </label>
          <select
            disabled={busy}
            id="generate-length"
            value={minutes}
            onChange={(e) => setMinutes(+e.target.value as SessionMinutes)}
          >
            {SESSION_MINUTES.map((n) => (
              <option key={n} value={n}>
                {n} minutes
              </option>
            ))}
          </select>
        </div>
      </div>
      <Button
        className="mt-5"
        disabled={busy || !ready || prompt.trim().length < 10}
        onClick={generate}
      >
        {busy ? <LoaderCircle className="animate-spin" /> : <Sparkles />}
        {busy
          ? "Building conversation and test…"
          : dialogue
            ? "Generate another"
            : "Generate conversation"}
      </Button>
      <p className="text-[10px] text-muted-foreground leading-5 mt-3">
        {ready
          ? "Powered by OpenRouter. Your prompt is sent to the model provider. Review the result before using it."
          : "OpenRouter generation is not connected yet. You can still write or paste your own text."}
      </p>
      {error && (
        <p
          role="alert"
          className="border border-zinc-400 rounded-md p-3 text-xs leading-5 mt-4"
        >
          {error}
        </p>
      )}
      <p className="text-[11px] text-muted-foreground mt-3 leading-5">
        Duration is a target at 1.0× speed. Natural voices and languages vary;
        actual audio time is shown after preparation. Longer sessions use more
        provider credits.
      </p>
      {dialogue && (
        <div className="border-t border-border mt-6 pt-6">
          <h3 className="text-sm font-medium mb-2">Review your conversation</h3>
          <p className="text-[11px] text-muted-foreground mb-4">
            {resultMinutes}-minute target · Script estimate{" "}
            {formatDuration(estimate)} at 1.0× · {questions.length} questions
          </p>
          {scene && (
            <div className="bg-zinc-50 border border-border rounded-lg p-4 mb-5 text-xs leading-6">
              <strong>Scenario</strong>
              <p>{scene}</p>
              {cast.map((c) => (
                <p key={c.name}>
                  <strong>{c.name}</strong> — {c.role}
                </p>
              ))}
              <p className="text-muted-foreground mt-2">
                Names are introduced in the spoken conversation.
              </p>
            </div>
          )}
          <label htmlFor="generated-title" className="field">
            Title
          </label>
          <input
            type="text"
            id="generated-title"
            maxLength={140}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setSaved(false);
            }}
          />
          <label htmlFor="generated-dialogue" className="field mt-4">
            Editable dialogue
          </label>
          <textarea
            id="generated-dialogue"
            className="min-h-64"
            value={dialogue}
            onChange={(e) => {
              setDialogue(e.target.value);
              setQuestions([]);
              setSaved(false);
            }}
          />
          {questions.length > 0 ? (
            <QuestionPreview questions={questions} />
          ) : (
            <p className="text-xs text-muted-foreground mt-3">
              Content questions will be rebuilt when you prepare this edited
              conversation.
            </p>
          )}
          <div className="flex gap-2 flex-wrap mt-4">
            <Button variant="outline" onClick={save}>
              <Save />
              {saved ? "Automatically saved" : "Save now"}
            </Button>
            <Button
              onClick={() =>
                onUse({
                  title: title.trim() || "Generated conversation",
                  dialogue,
                  lang: resultLang,
                  speakers: resultSpeakers,
                  minutes: resultMinutes,
                  questions,
                  scenario: scene,
                  cast,
                })
              }
            >
              Use for listening
              <ArrowRight />
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-3">
            Conversations save automatically to Library on this device.
          </p>
        </div>
      )}
    </div>
  );
}
export function SavedConversations({ onUse }: { onUse: (d: Draft) => void }) {
  const [drafts] = useState(loadDrafts);
  if (!drafts.length)
    return (
      <p className="text-xs text-muted-foreground mb-7">
        Save a generated or written conversation to find it here.
      </p>
    );
  return (
    <div className="space-y-3 mb-8">
      {drafts.map((d) => (
        <Card key={d.id} className="p-5 flex gap-4 items-center">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium truncate">{d.title}</h3>
            <p className="text-[10px] text-muted-foreground mt-2">
              {{ en: "English", te: "Telugu", hi: "Hindi" }[d.lang]} ·{" "}
              {d.speakers} speakers · Saved{" "}
              {new Date(d.createdAt).toLocaleDateString()}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => onUse(d)}>
            Use
            <ArrowRight />
          </Button>
        </Card>
      ))}
    </div>
  );
}
