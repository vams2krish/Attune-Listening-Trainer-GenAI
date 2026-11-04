"use client";
import { useState } from "react";
import { ArrowRight, LoaderCircle, Save, Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
export type Draft = {
  id: string;
  title: string;
  dialogue: string;
  lang: "en" | "hi" | "te";
  speakers: number;
  createdAt: string;
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
  if (existing) return;
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
  ready,
}: {
  lang: Draft["lang"];
  speakers: number;
  onLanguage: (l: Draft["lang"]) => void;
  onSpeakers: (n: number) => void;
  onUse: (d: Omit<Draft, "id" | "createdAt">) => void;
  ready: boolean;
}) {
  const [prompt, setPrompt] = useState(""),
    [turns, setTurns] = useState(6),
    [busy, setBusy] = useState(false),
    [title, setTitle] = useState(""),
    [dialogue, setDialogue] = useState(""),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false),
    [resultLang, setResultLang] = useState(lang),
    [resultSpeakers, setResultSpeakers] = useState(speakers);
  async function generate() {
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const r = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, lang, speakers, turns }),
      });
      const d = (await r.json()) as Omit<Draft, "id" | "createdAt"> & {
        error?: string;
      };
      if (!r.ok)
        throw Error(d.error || "Could not generate your conversation.");
      setTitle(d.title);
      setDialogue(d.dialogue);
      setResultLang(d.lang);
      setResultSpeakers(d.speakers);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed.");
    } finally {
      setBusy(false);
    }
  }
  function save() {
    try {
      saveDraft({
        title: title.trim() || "Generated conversation",
        dialogue,
        lang: resultLang,
        speakers: resultSpeakers,
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
      <label className="field" htmlFor="conversation-prompt">
        Describe the conversation
      </label>
      <textarea
        id="conversation-prompt"
        maxLength={1200}
        value={prompt}
        disabled={busy}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Three friends planning a trip to Hyderabad. They compare train times, agree on a budget, and change the meeting place."
      />
      <p className="text-[10px] text-muted-foreground mt-2">
        Choose a situation, topic, and the details you want to practice.
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
            Length
          </label>
          <select
            disabled={busy}
            id="generate-length"
            value={turns}
            onChange={(e) => setTurns(+e.target.value)}
          >
            <option value={6}>6 turns</option>
            <option value={10}>10 turns</option>
            <option value={14}>14 turns</option>
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
          ? "Generating…"
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
      {dialogue && (
        <div className="border-t border-border mt-6 pt-6">
          <h3 className="text-sm font-medium mb-4">Review your conversation</h3>
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
              setSaved(false);
            }}
          />
          <div className="flex gap-2 flex-wrap mt-4">
            <Button variant="outline" onClick={save}>
              <Save />
              {saved ? "Saved in Library" : "Save for later"}
            </Button>
            <Button
              onClick={() =>
                onUse({
                  title: title.trim() || "Generated conversation",
                  dialogue,
                  lang: resultLang,
                  speakers: resultSpeakers,
                })
              }
            >
              Use for listening
              <ArrowRight />
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-3">
            Saved conversations are kept on this device under Library.
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
