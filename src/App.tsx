"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowRight,
  AudioLines,
  BookOpen,
  ChartNoAxesColumn,
  ChevronRight,
  Headphones,
  LockKeyhole,
  Plus,
  Upload,
  Users,
  Volume2,
  Settings2,
} from "lucide-react";
import { Button } from "./components/ui/button";
import { Card } from "./components/ui/card";
import { scenarios, translations } from "./data";
import {
  ConversationStudio,
  SavedConversations,
  saveDraft,
  type Draft,
} from "./components/conversation-studio";
type Lang = "en" | "te" | "hi";
import {
  gradeAnswer,
  isAnswered,
  isAssessmentCurrent,
  type Question,
} from "./lib/questions";
import { ListeningDoodle, ListeningTrail } from "./components/listening-doodle";
import { AnswerSheet } from "./components/answer-sheet";
import {
  ResultCelebration,
  playResultSound,
} from "./components/result-celebration";
import { orderQuestions } from "./lib/assessment-validation";
import { ResultQuestion } from "./components/result-question";
import { QuestionPreview } from "./components/question-preview";
import {
  parseDialogue,
  speakerNamesFromDialogue,
  resolveSpeakerVoices,
  introduceSpeakers,
  chunkSpeech,
  formatDuration,
  estimatedSeconds,
  type SessionMinutes,
} from "./lib/session-content";
import { audioDuration, playOnce, type AudioPart } from "./lib/audio";
type Session = {
  title: string;
  lines: string[][];
  speakers: string[];
  questions: Question[];
  speed: number;
  lang: Lang;
  scenario?: string;
  cast?: { name: string; role: string; voiceStyle?: string }[];
  durationSeconds?: number;
  answers?: string[];
  score?: number;
  xp?: number;
};
type Entry = {
  id: number;
  date: string;
  day: string;
  title: string;
  score: number;
  xp: number;
  speed: number;
  lang: Lang;
};
const langs = { en: "English", te: "Telugu", hi: "Hindi" };
function getStreak(entries: Entry[]) {
  const days = new Set(entries.map((h) => new Date(h.date).toDateString()));
  const d = new Date();
  if (!days.has(d.toDateString())) d.setDate(d.getDate() - 1);
  let n = 0;
  while (days.has(d.toDateString())) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}
const day = (d = new Date()) =>
  `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
function loadHistory(): Entry[] {
  try {
    const h = JSON.parse(localStorage.getItem("attune-history") || "[]");
    return Array.isArray(h)
      ? h.filter(
          (x) =>
            x &&
            typeof x.score === "number" &&
            typeof x.date === "string" &&
            typeof x.xp === "number",
        )
      : [];
  } catch {
    return [];
  }
}
function Label({
  htmlFor,
  children,
}: {
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <label className="field" htmlFor={htmlFor}>
      {children}
    </label>
  );
}
function Heading({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-8">
      <h1 className="text-[30px] font-semibold tracking-[-1.1px] leading-tight">
        {title}
      </h1>
      <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
        {children}
      </p>
    </div>
  );
}
function Section({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="border-b border-border pb-7 mb-7">
      <div className="flex items-center gap-3 mb-5">
        <span className="text-xs text-muted-foreground tabular-nums">
          {number}
        </span>
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      {children}
    </section>
  );
}
export default function App() {
  const [view, setView] = useState("practice"),
    [phase, setPhase] = useState("setup"),
    [source, setSource] = useState("curated"),
    [scenario, setScenario] = useState("weekend"),
    [lang, setLang] = useState<Lang>("en"),
    [count, setCount] = useState(3),
    [speed, setSpeed] = useState(1),
    [custom, setCustom] = useState(""),
    [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]),
    [voiceIds, setVoiceIds] = useState<Record<string, string>>({}),
    [error, setError] = useState(""),
    [session, setSession] = useState<Session | null>(null),
    [answers, setAnswers] = useState<string[]>([]),
    [history, setHistory] = useState<Entry[]>([]),
    [saveError, setSaveError] = useState(false);
  const [capabilities, setCapabilities] = useState({
      generation: false,
      speech: false,
    }),
    [speechProvider, setSpeechProvider] = useState("elevenlabs"),
    [cloudVoices, setCloudVoices] = useState<
      { id: string; name: string; description: string; gender?: string }[]
    >([]),
    [cloudIds, setCloudIds] = useState<Record<string, string>>({}),
    [customTitle, setCustomTitle] = useState("Your conversation"),
    [draftSaved, setDraftSaved] = useState(false),
    [audioBusy, setAudioBusy] = useState(false),
    [prepared, setPrepared] = useState<{
      parts: AudioPart[];
      duration: number;
      fingerprint: string;
    } | null>(null);
  const [testMode, setTestMode] = useState("live");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [generatedNames, setGeneratedNames] = useState<string[]>([]);
  const [generatedCast, setGeneratedCast] = useState<
    NonNullable<Draft["cast"]>
  >([]);
  const [speakerStyles, setSpeakerStyles] = useState<Record<string, string>>(
    {},
  );
  const [soundOn, setSoundOn] = useState(true);
  const [effectsOn, setEffectsOn] = useState(true);
  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem("attune-preferences") || "{}");
      setSoundOn(p.sound !== false);
      setEffectsOn(p.effects !== false);
    } catch {}
  }, []);
  function updateFeedbackPreference(key: "sound" | "effects", value: boolean) {
    if (key === "sound") setSoundOn(value);
    else setEffectsOn(value);
    try {
      localStorage.setItem(
        "attune-preferences",
        JSON.stringify({
          sound: key === "sound" ? value : soundOn,
          effects: key === "effects" ? value : effectsOn,
        }),
      );
    } catch {}
  }
  const [targetMinutes, setTargetMinutes] = useState<SessionMinutes>(2);
  const [customContext, setCustomContext] = useState<{
    scenario?: string;
    cast?: { name: string; role: string; voiceStyle?: string }[];
  }>({});
  const [bank, setBank] = useState<{
    key: string;
    lang: Lang;
    questions: Question[];
  } | null>(null);
  const [prepareStatus, setPrepareStatus] = useState("");
  const audioCache = useRef(new Map<string, AudioPart>());
  const dialogueKey = (lines: string[][]) =>
    lines.map(([n, t]) => `${n}: ${t}`).join("\n");
  async function ensureAssessment(s: Session) {
    const key = dialogueKey(s.lines);
    if (isAssessmentCurrent(s.questions, s.lang))
      return { ...s, questions: orderQuestions(s.questions) };
    setPrepareStatus("Building content-based test questions…");
    const r = await fetch("/api/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dialogue: key,
        lang: s.lang,
        minutes: targetMinutes,
      }),
    });
    const data = (await r.json()) as { questions: Question[]; error?: string };
    if (!r.ok) throw Error(data.error || "Could not build the question set.");
    setBank({ key, lang: s.lang, questions: orderQuestions(data.questions) });
    return { ...s, questions: orderQuestions(data.questions) };
  }

  const audioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    if (lang !== "en") setSpeechProvider("elevenlabs");
  }, [lang]);
  useEffect(() => {
    setHistory(loadHistory());
    fetch("/api/status")
      .then((r) =>
        r.ok
          ? (r.json() as Promise<{ generation: boolean; speech: boolean }>)
          : null,
      )
      .then((d) => {
        if (d) {
          setCapabilities(d);
          if (d.speech) setSpeechProvider("elevenlabs");
        }
      })
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (speechProvider !== "elevenlabs") return;
    const controller = new AbortController();
    fetch("/api/voices", { signal: controller.signal })
      .then(async (r) => {
        const d = (await r.json()) as {
          error?: string;
          voices: {
            id: string;
            name: string;
            description: string;
            gender?: string;
          }[];
        };
        if (!r.ok) throw Error(d.error);
        setCloudVoices(d.voices);
      })
      .catch((e) => {
        if (e.name !== "AbortError")
          setError(e.message || "Unable to load voices.");
      });
    return () => controller.abort();
  }, [speechProvider]);
  useEffect(() => {
    for (const part of audioCache.current.values())
      URL.revokeObjectURL(part.url);
    audioCache.current.clear();
    setPrepared(null);
  }, [
    custom,
    source,
    lang,
    scenario,
    count,
    cloudIds,
    speakerStyles,
    speechProvider,
  ]);
  function useConversation(d: Omit<Draft, "id" | "createdAt">) {
    setSpeakerStyles(d.voiceStyles || {});
    setCloudIds(d.voiceAssignments || {});
    setVoiceIds(d.deviceVoiceAssignments || {});
    setCustom(d.dialogue);
    setCustomTitle(d.title);
    setTargetMinutes(d.minutes || 2);
    setCustomContext({ scenario: d.scenario, cast: d.cast });
    setBank(
      d.questions && isAssessmentCurrent(d.questions, d.lang)
        ? {
            key: dialogueKey(parseDialogue(d.dialogue)),
            lang: d.lang,
            questions: orderQuestions(d.questions),
          }
        : null,
    );
    setLang(d.lang);
    setCount(d.speakers);
    setSource("custom");
    setView("practice");
    setDraftSaved(false);
    setError("");
    window.scrollTo(0, 0);
  }
  useEffect(() => {
    if (source !== "custom" || !custom.trim()) return;
    const persist = () => {
      try {
        const lines = parseDialogue(custom);
        if (new Set(lines.map((l) => l[0])).size !== count) return;
        saveDraft({
          title: customTitle || "Your conversation",
          dialogue: custom,
          lang,
          speakers: count,
          voiceStyles: speakerStyles,
          voiceAssignments: cloudIds,
          deviceVoiceAssignments: voiceIds,
          minutes: targetMinutes,
          scenario: customContext.scenario,
          cast: customContext.cast,
          questions:
            bank?.key === dialogueKey(lines) && bank.lang === lang
              ? orderQuestions(bank.questions)
              : [],
        });
        setDraftSaved(true);
      } catch {
        setDraftSaved(false);
      }
    };
    const timer = window.setTimeout(persist, 900);
    window.addEventListener("pagehide", persist);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pagehide", persist);
    };
  }, [
    custom,
    customTitle,
    source,
    lang,
    count,
    targetMinutes,
    customContext,
    bank,
    speakerStyles,
    cloudIds,
    voiceIds,
  ]);
  function saveWritten() {
    try {
      prepare();
      saveDraft({
        title: customTitle,
        dialogue: custom,
        lang,
        speakers: count,
        voiceStyles: speakerStyles,
        voiceAssignments: cloudIds,
        deviceVoiceAssignments: voiceIds,
        minutes: targetMinutes,
        scenario: customContext.scenario,
        cast: customContext.cast,
        questions:
          bank?.key === dialogueKey(prepare().lines) && bank.lang === lang
            ? bank.questions
            : [],
      });
      setDraftSaved(true);
      setError("");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not save the conversation.",
      );
    }
  }
  async function start() {
    if (source === "generate") {
      setError("Generate a conversation, then choose Use for listening.");
      return;
    }
    if (running.current || audioBusy) return;
    let started = false;
    setAudioBusy(true);
    setError("");
    try {
      let s = prepare();
      if (speechProvider === "elevenlabs") {
        const missing = s.speakers.filter((name) => !preferredStyles[name]);
        if (missing.length) {
          setSettingsOpen(true);
          throw Error(
            `Choose a voice style for ${missing.join(", ")} in Settings. This avoids guessing from names.`,
          );
        }
      }
      let ids: string[] = [];
      if (speechProvider === "elevenlabs") {
        const assigned = resolveSpeakerVoices(
          s.speakers,
          cloudVoices.map((v) => v.id),
          cloudIds,
          effectiveStyles,
          providerStyles,
        );
        ids = s.speakers.map((name) => assigned[name]);
        if (ids.some((id) => !id) || new Set(ids).size !== s.speakers.length)
          throw Error("Choose a different ElevenLabs voice for every speaker.");
      }
      s = await ensureAssessment(s);
      saveDraft({
        title: s.title,
        dialogue: dialogueKey(s.lines),
        lang: s.lang,
        speakers: s.speakers.length,
        voiceStyles: preferredStyles,
        voiceAssignments: cloudVoiceAssignments,
        deviceVoiceAssignments,
        minutes: targetMinutes,
        scenario: s.scenario,
        cast: s.cast,
        questions: s.questions,
      });
      s = { ...s, lines: introduceSpeakers(s.lines, s.lang, s.scenario) };
      if (speechProvider === "browser" && lang === "en") {
        await startBrowser(s);
        return;
      }
      const fingerprint = JSON.stringify({ lines: s.lines, lang: s.lang, ids });
      if (!prepared || prepared.fingerprint !== fingerprint) {
        const chunks = chunkSpeech(
          s.lines.map(([name, text]) => ({
            text,
            voice_id: ids[s.speakers.indexOf(name)],
          })),
        );
        const parts: AudioPart[] = [];
        for (let i = 0; i < chunks.length; i++) {
          setPrepareStatus(`Preparing audio ${i + 1} of ${chunks.length}…`);
          const key = JSON.stringify({ lang: s.lang, inputs: chunks[i] });
          let part = audioCache.current.get(key);
          if (!part) {
            const r = await fetch("/api/speech", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: key,
            });
            if (!r.ok) {
              const data = (await r.json()) as { error?: string };
              throw Error(data.error || "Could not prepare an audio part.");
            }
            const blob = await r.blob();
            const url = URL.createObjectURL(blob);
            try {
              part = { url, duration: await audioDuration(url) };
            } catch (e) {
              URL.revokeObjectURL(url);
              throw e;
            }
            audioCache.current.set(key, part);
          }
          parts.push(part);
        }
        setPrepared({
          parts,
          duration: parts.reduce((n, p) => n + p.duration, 0),
          fingerprint,
        });
        return;
      }
      running.current = true;
      started = true;
      s.durationSeconds = prepared.duration / s.speed;
      setSession(s);
      setAnswers(Array(s.questions.length).fill(""));
      setPhase("listening");
      await playOnce(prepared.parts, s.speed, (a) => {
        audioRef.current = a;
      });
      setPhase("questions");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to prepare this session.",
      );
      setPhase("setup");
      setSession(null);
    } finally {
      running.current = false;
      setAudioBusy(false);
      setPrepareStatus("");
      if (started) {
        for (const part of audioCache.current.values())
          URL.revokeObjectURL(part.url);
        audioCache.current.clear();
        setPrepared(null);
        audioRef.current = null;
      }
    }
  }
  const utterance = useRef<SpeechSynthesisUtterance | null>(null),
    running = useRef(false),
    fileInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!window.speechSynthesis) return;
    const update = () => setVoices(speechSynthesis.getVoices());
    update();
    speechSynthesis.addEventListener("voiceschanged", update);
    return () => speechSynthesis.removeEventListener("voiceschanged", update);
  }, []);
  useEffect(() => {
    const prevent = (e: BeforeUnloadEvent) => {
      if (phase === "listening" || phase === "questions") {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", prevent);
    return () => window.removeEventListener("beforeunload", prevent);
  }, [phase]);
  const matching = voices.filter((v) => v.lang.toLowerCase().startsWith(lang));
  const selected = scenarios.find((s) => s.id === scenario)!;
  const speakerNames =
    source === "custom"
      ? speakerNamesFromDialogue(custom)
      : source === "generate"
        ? generatedNames
        : [
            ...new Set(
              (lang === "en" ? selected.lines : translations[lang]).map(
                (line) => line[0],
              ),
            ),
          ];
  const castStyles = Object.fromEntries(
    (source === "generate" ? generatedCast : customContext.cast || []).map(
      (c) => [c.name, c.voiceStyle || ""],
    ),
  );
  const preferredStyles: Record<string, string> =
    source === "curated"
      ? { Maya: "female", Arjun: "male", Leah: "female", ...speakerStyles }
      : { ...castStyles, ...speakerStyles };
  const effectiveStyles = Object.fromEntries(
    speakerNames.map((name) => [name, preferredStyles[name] || "unselected"]),
  );
  const providerStyles = Object.fromEntries(
    cloudVoices.map((v) => [v.id, v.gender || "unknown"]),
  );
  const cloudVoiceAssignments = resolveSpeakerVoices(
    speakerNames,
    cloudVoices.map((v) => v.id),
    cloudIds,
    effectiveStyles,
    providerStyles,
  );
  const deviceVoiceAssignments = resolveSpeakerVoices(
    speakerNames,
    matching.map((v) => v.voiceURI),
    voiceIds,
  );
  const speakerKey = JSON.stringify(speakerNames);
  const cloudVoiceKey = JSON.stringify(cloudVoices.map((v) => v.id));
  const styleKey = JSON.stringify(effectiveStyles);
  const providerStyleKey = JSON.stringify(providerStyles);
  const deviceVoiceKey = JSON.stringify(matching.map((v) => v.voiceURI));
  useEffect(() => {
    const names: string[] = JSON.parse(speakerKey),
      available: string[] = JSON.parse(cloudVoiceKey);
    setCloudIds((old) => {
      const resolved = resolveSpeakerVoices(
        names,
        available,
        old,
        JSON.parse(styleKey),
        JSON.parse(providerStyleKey),
      );
      return names.every((name) => old[name] === resolved[name])
        ? old
        : { ...old, ...resolved };
    });
  }, [speakerKey, cloudVoiceKey, styleKey, providerStyleKey]);
  useEffect(() => {
    const names: string[] = JSON.parse(speakerKey),
      available: string[] = JSON.parse(deviceVoiceKey);
    setVoiceIds((old) => {
      const resolved = resolveSpeakerVoices(names, available, old);
      return names.every((name) => old[name] === resolved[name])
        ? old
        : { ...old, ...resolved };
    });
  }, [speakerKey, deviceVoiceKey]);
  function go(v: string) {
    if (phase !== "setup" || audioBusy) return;
    if (source === "custom" && custom.trim()) saveWritten();
    else setError("");
    setView(v);
  }
  function prepare(): Session {
    const lines =
      source === "custom"
        ? parseDialogue(custom)
        : lang === "en"
          ? selected.lines
          : translations[lang];
    const speakers = [...new Set(lines.map((l) => l[0]))];
    if (speakers.length !== count)
      throw Error(
        `The dialogue has ${speakers.length} speakers. Change the speaker count to match.`,
      );
    const key = dialogueKey(lines);
    const scenarioBrief =
      source === "custom"
        ? customContext.scenario || customTitle
        : lang === "en"
          ? selected.description
          : lang === "te"
            ? "ముగ్గురు స్నేహితులు వారాంతపు ప్రణాళిక గురించి మాట్లాడుకుంటున్నారు."
            : "तीन मित्र सप्ताहांत की योजना पर चर्चा कर रहे हैं।";
    return {
      title:
        source === "custom"
          ? customTitle
          : lang === "en"
            ? selected.title
            : "The weekend plan",
      lines,
      speakers,
      questions:
        bank?.key === key &&
        bank.lang === lang &&
        isAssessmentCurrent(bank.questions, lang)
          ? bank.questions
          : [],
      scenario: scenarioBrief,
      cast: source === "custom" ? customContext.cast : undefined,
      speed,
      lang,
    };
  }
  async function startBrowser(s: Session) {
    if (running.current) return;
    try {
      if (!window.speechSynthesis || !matching.length)
        throw Error("Choose ElevenLabs for reliable multilingual speech.");
      const byName = resolveSpeakerVoices(
        s.speakers,
        matching.map((v) => v.voiceURI),
        voiceIds,
      );
      const assignments = s.speakers.map(
        (name, i) =>
          matching.find((v) => v.voiceURI === byName[name]) ||
          matching[i % matching.length],
      );
      running.current = true;
      setSession(s);
      setAnswers(Array(s.questions.length).fill(""));
      setError("");
      setPhase("listening");
      for (const [name, text] of s.lines) {
        const i = s.speakers.indexOf(name);
        await new Promise<void>((resolve, reject) => {
          const u = new SpeechSynthesisUtterance(text);
          utterance.current = u;
          u.voice = assignments[i];
          u.lang = assignments[i].lang;
          u.rate = s.speed;
          u.pitch = [1.15, 0.75, 1.45, 0.9, 1.3, 0.65][i];
          const timeout = window.setTimeout(
            () =>
              reject(
                Error(
                  "Device speech did not finish. Choose ElevenLabs in Settings for reliable playback.",
                ),
              ),
            Math.max(
              20000,
              (text.split(/\s+/).length / (2 * s.speed)) * 1000 + 15000,
            ),
          );
          u.onend = () => {
            clearTimeout(timeout);
            resolve();
          };
          u.onerror = () => {
            clearTimeout(timeout);
            reject(
              Error(
                "Audio was interrupted. This attempt was discarded. Choose ElevenLabs in Settings or check your output device.",
              ),
            );
          };
          speechSynthesis.speak(u);
        });
      }
      setPhase("questions");
      window.scrollTo(0, 0);
    } catch (e) {
      window.speechSynthesis?.cancel();
      setPhase("setup");
      setSession(null);
      setError(e instanceof Error ? e.message : "Unable to start playback.");
    } finally {
      running.current = false;
      utterance.current = null;
    }
  }
  function submit() {
    if (
      phase !== "questions" ||
      !session ||
      session.questions.some((q, i) => !isAnswered(q, answers[i]))
    )
      return;
    const correct = session.questions.filter((q, i) =>
      gradeAnswer(q, answers[i]),
    ).length;
    const score = Math.round((correct / session.questions.length) * 100),
      xp = Math.round(correct * 15 * (0.75 + session.speed * 0.25));
    if (soundOn) playResultSound(score);
    setSession({ ...session, answers, score, xp });
    const entry = {
      id: Date.now(),
      date: new Date().toISOString(),
      day: day(),
      title: session.title,
      score,
      xp,
      speed: session.speed,
      lang: session.lang,
    };
    const next = [entry, ...history];
    setHistory(next);
    try {
      localStorage.setItem("attune-history", JSON.stringify(next));
      setSaveError(false);
    } catch {
      setSaveError(true);
    }
    setPhase("results");
    window.scrollTo(0, 0);
  }
  function reset() {
    setSession(null);
    setPhase("setup");
    setView("practice");
    window.scrollTo(0, 0);
  }
  const avg = history.length
    ? Math.round(history.reduce((a, h) => a + h.score, 0) / history.length)
    : 0;
  if (phase === "listening" && testMode === "recall")
    return (
      <div
        className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center px-6 text-center"
        role="status"
      >
        <img src="/logo.svg" alt="Attune" className="size-10 mb-24" />
        <div className="wave flex items-center gap-2 h-20 mb-10">
          {[20, 38, 56, 32, 70, 44, 60, 28, 48].map((h, i) => (
            <i key={i} style={{ height: h }} />
          ))}
        </div>
        <h1 className="text-2xl font-medium tracking-tight">Just listen.</h1>
        <p className="text-zinc-500 text-sm mt-4 leading-7">
          Follow the conversation.
          <br />
          Questions will appear when it ends.
        </p>
        <p className="text-zinc-600 text-xs mt-20">
          {langs[lang]} <span className="mx-3">/</span>{" "}
          {session?.speakers.length} speakers <span className="mx-3">/</span>{" "}
          {speed.toFixed(1)}×
        </p>
      </div>
    );
  return (
    <div className="min-h-screen">
      <aside className="md:fixed md:inset-y-0 md:w-[216px] border-b md:border-b-0 md:border-r border-border bg-white p-5 md:p-6 flex md:flex-col justify-between md:justify-start items-center md:items-stretch">
        <button
          onClick={() => go("practice")}
          className="flex items-center gap-2.5 text-xl font-semibold tracking-[-.8px] text-left"
          aria-label="Attune home"
        >
          <img src="/logo.svg" alt="" className="size-8" />
          attune
        </button>
        <div className="hidden md:block text-[10px] uppercase tracking-[1.5px] text-zinc-400 mt-12 mb-4">
          Workspace
        </div>
        <nav className="flex md:flex-col gap-1 md:mt-0">
          {[
            { id: "practice", label: "Practice", icon: Headphones },
            { id: "progress", label: "Progress", icon: ChartNoAxesColumn },
            { id: "library", label: "Library", icon: BookOpen },
          ].map((n) => (
            <button
              key={n.id}
              aria-label={n.label}
              disabled={phase !== "setup" || audioBusy}
              onClick={() => go(n.id)}
              aria-current={view === n.id ? "page" : undefined}
              className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-[13px] transition-colors disabled:opacity-40 ${view === n.id ? "bg-zinc-100 text-zinc-950 font-medium" : "text-zinc-500 hover:bg-zinc-50"}`}
            >
              <n.icon size={16} />
              <span className="hidden sm:inline">{n.label}</span>
            </button>
          ))}
        </nav>
        <div className="mt-auto hidden md:block pt-8">
          <div className="border-t border-border pt-5 flex items-center gap-2.5">
            <div className="size-8 rounded-full bg-zinc-100 flex items-center justify-center text-xs">
              Y
            </div>
            <div className="text-xs font-medium">
              Your workspace
              <p className="font-normal text-[11px] text-muted-foreground mt-1">
                Stored on this device
              </p>
            </div>
          </div>
        </div>
      </aside>
      <main className="md:ml-[216px]">
        <header className="h-16 px-6 lg:px-12 border-b border-border flex items-center justify-between bg-white">
          <div className="text-xs text-muted-foreground">
            Workspace{" "}
            <ChevronRight className="inline size-3 mx-2 text-zinc-300" />
            <span className="text-foreground">
              {view === "practice"
                ? "Practice"
                : view === "progress"
                  ? "Progress"
                  : "Library"}
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-zinc-400" />
            Personal practice
          </span>
        </header>
        <div className="max-w-[1120px] mx-auto px-6 lg:px-12 pt-10 pb-16">
          {phase === "setup" && view === "practice" && (
            <>
              <div className="workspace-welcome">
                <div>
                  <span className="welcome-eyebrow">
                    <span />A small workout for your attention
                  </span>
                  <Heading title="A little more focused.">
                    Train your attention, one conversation at a time.
                  </Heading>
                  <span className="session-stamp">
                    {history.length} sessions completed{" "}
                    <span aria-hidden="true">↗</span>
                  </span>
                </div>
                <ListeningDoodle />
              </div>
              <Card className="p-6 sm:p-8 setup-surface">
                <ListeningTrail />
                <fieldset disabled={audioBusy} className="min-w-0">
                  <Section number="01" title="Conversation">
                    <div className="inline-flex flex-wrap rounded-lg bg-zinc-100 p-1 mb-5 gap-1">
                      {[
                        ["curated", "Scenarios"],
                        ["custom", "Write or paste text"],
                        ["generate", "Generate with AI"],
                      ].map(([id, label]) => (
                        <Button
                          key={id}
                          size="sm"
                          variant="ghost"
                          className={
                            source === id
                              ? "bg-white text-foreground shadow-xs hover:bg-white"
                              : ""
                          }
                          onClick={() => {
                            if (source === "custom" && custom.trim())
                              saveWritten();
                            setSource(id);
                            if (id === "curated") setCount(3);
                            setError("");
                          }}
                        >
                          {label}
                        </Button>
                      ))}
                    </div>
                    {source === "generate" ? (
                      <ConversationStudio
                        lang={lang}
                        speakers={count}
                        onLanguage={setLang}
                        onSpeakers={setCount}
                        onUse={useConversation}
                        onSpeakerNames={setGeneratedNames}
                        onCast={setGeneratedCast}
                        ready={capabilities.generation}
                      />
                    ) : source === "curated" ? (
                      <>
                        <Label htmlFor="scenario">Choose a scenario</Label>
                        <select
                          id="scenario"
                          value={scenario}
                          onChange={(e) => setScenario(e.target.value)}
                        >
                          {scenarios.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.title}
                            </option>
                          ))}
                        </select>
                        <div className="mt-4 flex gap-3 items-start rounded-lg bg-zinc-50 p-4 border border-zinc-100">
                          <Users className="size-4 mt-0.5 text-zinc-500 shrink-0" />
                          <div>
                            <p className="text-xs leading-5">
                              {lang === "en"
                                ? selected.description
                                : "Three friends make plans for the weekend."}
                            </p>
                            <p className="text-[11px] mt-1.5 text-muted-foreground">
                              3 speakers <span className="mx-2">·</span> 6 turns{" "}
                              <span className="mx-2">·</span> Everyday listening
                            </p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <Label htmlFor="dialogue-title">
                          Conversation title
                        </Label>
                        <input
                          className="mb-4"
                          id="dialogue-title"
                          onBlur={() => {
                            if (custom.trim()) saveWritten();
                          }}
                          type="text"
                          maxLength={140}
                          value={customTitle}
                          onChange={(e) => {
                            setCustomTitle(e.target.value);
                            setDraftSaved(false);
                          }}
                        />
                        <Label htmlFor="dialogue">
                          Write your conversation
                        </Label>
                        <p className="text-[11px] text-muted-foreground mb-3">
                          Use Speaker: dialogue, one turn per line.
                        </p>
                        <textarea
                          id="dialogue"
                          onBlur={() => {
                            if (custom.trim()) saveWritten();
                          }}
                          value={custom}
                          onChange={(e) => {
                            setCustom(e.target.value);
                            setDraftSaved(false);
                          }}
                          placeholder={
                            "Maya: Shall we meet at eleven?\nArjun: That works for me."
                          }
                        />
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-[11px] text-muted-foreground">
                            4–240 turns · 2–6 speakers
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => fileInput.current?.click()}
                          >
                            <Upload />
                            Import .txt
                          </Button>
                          <input
                            ref={fileInput}
                            type="file"
                            accept=".txt,text/plain"
                            className="hidden"
                            aria-label="Import dialogue"
                            onChange={async (e) => {
                              const f = e.target.files?.[0];
                              if (!f) return;
                              if (f.size > 120000) {
                                setError(
                                  "Choose a text file smaller than 120 KB.",
                                );
                                return;
                              }
                              setCustom(await f.text());
                            }}
                          />
                        </div>
                        <Button
                          className="mt-4"
                          variant="outline"
                          size="sm"
                          onClick={saveWritten}
                        >
                          {draftSaved
                            ? "Automatically saved to Library"
                            : "Save now"}
                        </Button>
                      </>
                    )}
                  </Section>
                  <div className="flex flex-wrap items-center justify-between gap-3 py-4 mb-5 border-b border-border">
                    <div>
                      <p className="text-xs font-medium">
                        Ready with sensible defaults
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {langs[lang]} · {count} speakers · {speed.toFixed(1)}× ·{" "}
                        {speechProvider === "elevenlabs"
                          ? "ElevenLabs"
                          : "Device speech"}{" "}
                        ·{" "}
                        {testMode === "live"
                          ? "Answer while listening"
                          : "Memory practice"}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      aria-expanded={settingsOpen}
                      aria-controls="session-settings"
                      onClick={() => setSettingsOpen(!settingsOpen)}
                    >
                      <Settings2 />
                      Settings
                    </Button>
                  </div>
                  {settingsOpen && (
                    <div id="session-settings" className="settings-reveal">
                      <Section number="02" title="Listening preferences">
                        <div className="mb-5">
                          <Label htmlFor="test-mode">Practice mode</Label>
                          <select
                            id="test-mode"
                            value={testMode}
                            onChange={(e) => setTestMode(e.target.value)}
                          >
                            <option value="live">
                              Listen and answer — IELTS style
                            </option>
                            <option value="recall">
                              Listen first, answer from memory
                            </option>
                          </select>
                          <p className="text-[11px] text-muted-foreground mt-2 leading-5">
                            {testMode === "live"
                              ? "Questions stay open during the recording. Submit after the audio ends."
                              : "Focus only on listening. Questions appear after the audio ends."}
                          </p>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="language">Language</Label>
                            <select
                              id="language"
                              value={lang}
                              onChange={(e) => {
                                setLang(e.target.value as Lang);
                                setVoiceIds({});
                                if (e.target.value !== "en")
                                  setSpeechProvider("elevenlabs");
                              }}
                            >
                              <option value="en">English</option>
                              <option value="te">Telugu · తెలుగు</option>
                              <option value="hi">Hindi · हिन्दी</option>
                            </select>
                          </div>
                          <div>
                            <Label htmlFor="speakers">Speakers</Label>
                            <select
                              id="speakers"
                              disabled={source === "curated"}
                              value={count}
                              onChange={(e) => setCount(+e.target.value)}
                            >
                              {[2, 3, 4, 5, 6].map((n) => (
                                <option key={n} value={n}>
                                  {n} speakers
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div className="mt-6">
                          <div className="flex justify-between items-center">
                            <Label htmlFor="speed">Playback speed</Label>
                            <span className="text-xs font-medium tabular-nums bg-zinc-100 rounded px-2 py-1">
                              {speed.toFixed(1)}×
                            </span>
                          </div>
                          <input
                            className="w-full mt-2 h-4"
                            id="speed"
                            type="range"
                            min=".5"
                            max="3"
                            step=".1"
                            value={speed}
                            onChange={(e) => setSpeed(+e.target.value)}
                          />
                          <div className="flex justify-between text-[10px] text-zinc-400 mt-1">
                            <span>0.5×</span>
                            <button
                              onClick={() => setSpeed(1)}
                              className="hover:text-black"
                            >
                              1.0× normal
                            </button>
                            <span>3.0×</span>
                          </div>
                        </div>
                      </Section>
                      <section>
                        <div className="mb-5">
                          <Label htmlFor="speech-provider">
                            Speech provider
                          </Label>
                          <select
                            id="speech-provider"
                            value={speechProvider}
                            onChange={(e) => {
                              setSpeechProvider(e.target.value);
                              setError("");
                            }}
                          >
                            <option
                              value="elevenlabs"
                              disabled={!capabilities.speech}
                            >
                              ElevenLabs
                              {!capabilities.speech ? " — not connected" : ""}
                            </option>
                            <option value="browser" disabled={lang !== "en"}>
                              Device voices — English only
                            </option>
                          </select>
                        </div>
                        <div className="flex items-center justify-between mb-5">
                          <div className="flex gap-3 items-center">
                            <span className="text-xs text-muted-foreground">
                              03
                            </span>
                            <h2 className="text-sm font-semibold">Voices</h2>
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {speechProvider === "elevenlabs"
                              ? "Eleven v3"
                              : "Device speech"}
                          </span>
                        </div>
                        <div className="space-y-3">
                          {!speakerNames.length && (
                            <p className="text-xs text-muted-foreground">
                              Generate or write your conversation first. Each
                              speaker’s name will appear here with their voice.
                            </p>
                          )}
                          {speakerNames.map((name, i) => (
                            <div
                              className="grid grid-cols-[auto_1fr] sm:grid-cols-[32px_96px_130px_minmax(0,1fr)] gap-3 items-center"
                              key={`${lang}-${name}`}
                            >
                              <div className="size-8 rounded-full border border-border flex items-center justify-center text-[11px] text-zinc-500 shrink-0">
                                {String(i + 1).padStart(2, "0")}
                              </div>
                              <label
                                htmlFor={`voice${i}`}
                                className="text-xs w-24 shrink-0 break-words"
                              >
                                {name}
                              </label>
                              <select
                                aria-label={`Voice style for ${name}`}
                                value={preferredStyles[name] || ""}
                                onChange={(e) =>
                                  setSpeakerStyles((old) => ({
                                    ...old,
                                    [name]: e.target.value,
                                  }))
                                }
                              >
                                <option value="" disabled>
                                  Choose style
                                </option>
                                <option value="female">Female voice</option>
                                <option value="male">Male voice</option>
                                <option value="neutral">Neutral voice</option>
                              </select>
                              <select
                                id={`voice${i}`}
                                aria-label={`Voice for ${name}`}
                                value={
                                  speechProvider === "elevenlabs"
                                    ? cloudVoiceAssignments[name] || ""
                                    : deviceVoiceAssignments[name] || ""
                                }
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (speechProvider === "elevenlabs")
                                    setCloudIds((old) => {
                                      return { ...old, [name]: value };
                                    });
                                  else
                                    setVoiceIds((old) => {
                                      return { ...old, [name]: value };
                                    });
                                }}
                              >
                                {speechProvider === "elevenlabs" &&
                                  !preferredStyles[name] && (
                                    <option value="">
                                      Choose voice style first
                                    </option>
                                  )}
                                {speechProvider === "elevenlabs" ? (
                                  cloudVoices.length ? (
                                    cloudVoices
                                      .filter(
                                        (v) =>
                                          v.gender === preferredStyles[name],
                                      )
                                      .map((v) => (
                                        <option key={v.id} value={v.id}>
                                          {v.name}
                                          {v.description
                                            ? ` · ${v.description}`
                                            : ""}
                                        </option>
                                      ))
                                  ) : (
                                    <option value="">Loading voices…</option>
                                  )
                                ) : matching.length ? (
                                  matching.map((v) => (
                                    <option key={v.voiceURI} value={v.voiceURI}>
                                      {v.name.replace("Microsoft ", "")}
                                    </option>
                                  ))
                                ) : (
                                  <option value="">No voice available</option>
                                )}
                              </select>
                            </div>
                          ))}
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-5 mt-4">
                          {speechProvider === "elevenlabs"
                            ? "Choose distinct voices. Audio is prepared before your scored listen."
                            : matching.length < count
                              ? "Pitch varies between speakers. Install additional voices for clearer separation."
                              : "Choose distinct voices to practice speaker recognition."}
                          {lang !== "en" && source === "curated"
                            ? " Telugu and Hindi use the weekend scenario. Feedback is in English."
                            : ""}
                        </p>
                        <div className="flex flex-wrap gap-5 border-t border-border mt-5 pt-5">
                          <label className="text-xs flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={soundOn}
                              onChange={(e) =>
                                updateFeedbackPreference(
                                  "sound",
                                  e.target.checked,
                                )
                              }
                            />
                            Result sounds
                          </label>
                          <label className="text-xs flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={effectsOn}
                              onChange={(e) =>
                                updateFeedbackPreference(
                                  "effects",
                                  e.target.checked,
                                )
                              }
                            />
                            Celebration effects
                          </label>
                        </div>
                      </section>
                    </div>
                  )}
                  {bank &&
                    (() => {
                      try {
                        return bank.key === dialogueKey(prepare().lines) &&
                          bank.lang === lang ? (
                          <QuestionPreview questions={bank.questions} />
                        ) : null;
                      } catch {
                        return null;
                      }
                    })()}
                </fieldset>
                <aside className="space-y-5 border-t border-border mt-6 pt-6">
                  <div className="session-summary">
                    <div className="flex items-center gap-2 text-xs font-medium mb-5">
                      <AudioLines className="size-4" />
                      Your session
                    </div>
                    <dl className="text-xs grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {[
                        ["Language", langs[lang]],
                        ["Speakers", String(count)],
                        ["Speed", `${speed.toFixed(1)}×`],
                        ["Playback", "One listen"],
                      ].map(([l, v]) => (
                        <div key={l} className="flex justify-between">
                          <dt className="text-muted-foreground">{l}</dt>
                          <dd>{v}</dd>
                        </div>
                      ))}
                    </dl>
                    <div className="border-t border-border mt-5 pt-5">
                      <p className="text-[11px] text-muted-foreground leading-5 mb-4">
                        {testMode === "live"
                          ? "Keep the answer sheet open while you listen. The recording plays once."
                          : "Find a quiet place. Once you begin, audio plays through without pausing."}
                      </p>
                      <Button
                        className="w-full"
                        disabled={audioBusy || source === "generate"}
                        onClick={start}
                      >
                        {audioBusy
                          ? prepareStatus || "Preparing session…"
                          : speechProvider === "elevenlabs" && !prepared
                            ? "Prepare session"
                            : "Start listening"}
                        <ArrowRight />
                      </Button>
                      {prepared && (
                        <p role="status" className="text-[11px] leading-5 mt-3">
                          Audio ready ·{" "}
                          {formatDuration(prepared.duration / speed)} at{" "}
                          {speed.toFixed(1)}× · {prepared.parts.length} audio
                          part{prepared.parts.length === 1 ? "" : "s"}. Plays
                          through once without replay controls.
                        </p>
                      )}
                    </div>
                  </div>
                  {source !== "generate" && (
                    <div className="border border-border bg-white rounded-lg p-4 text-xs leading-6">
                      <strong>Scenario and speakers</strong>
                      <p className="text-muted-foreground mt-2">
                        {source === "custom"
                          ? customContext.scenario || customTitle
                          : lang === "en"
                            ? selected.description
                            : lang === "te"
                              ? "వారాంతపు ప్రణాళిక గురించి స్నేహితుల సంభాషణ."
                              : "सप्ताहांत की योजना पर दोस्तों की बातचीत।"}
                      </p>
                      <ul className="mt-3">
                        {speakerNames.slice(0, count).map((name) => (
                          <li key={name}>
                            <strong>{name}</strong>
                            {customContext.cast?.find((c) => c.name === name)
                              ?.role
                              ? " — " +
                                customContext.cast.find((c) => c.name === name)!
                                  .role
                              : ""}
                          </li>
                        ))}
                      </ul>
                      <p className="text-[11px] text-muted-foreground mt-2">
                        Each voice introduces their name in the recording.
                      </p>
                    </div>
                  )}
                  <div className="px-1">
                    <p className="text-xs font-medium flex items-center gap-2">
                      <LockKeyhole className="size-3.5" />
                      Focus comes first
                    </p>
                    <p className="text-[11px] text-muted-foreground leading-6 mt-2">
                      {testMode === "live"
                        ? "Listen once and answer along. Complete the full set to unlock feedback and the transcript."
                        : "Listen once. Answer every question. Then review your answers and the full transcript."}
                    </p>
                  </div>
                  {error && (
                    <p
                      role="alert"
                      className="border border-zinc-400 rounded-md p-4 text-xs leading-6 bg-white"
                    >
                      {error}
                    </p>
                  )}
                  <p className="text-[10px] text-zinc-400 px-1 leading-5">
                    {speechProvider === "elevenlabs"
                      ? "Your dialogue is sent to ElevenLabs to create speech."
                      : "Voice availability depends on your device."}
                    <br />
                    Your progress stays in this browser.
                  </p>
                </aside>
              </Card>
            </>
          )}
          {(phase === "questions" ||
            (phase === "listening" && testMode === "live")) &&
            session && (
              <>
                <Heading
                  title={
                    phase === "listening"
                      ? "Listen and answer."
                      : "Review your answers."
                  }
                >
                  {phase === "listening"
                    ? "Follow the conversation and answer as you listen. Feedback comes after submission."
                    : "The recording has ended. Finish your answers, then submit the full set."}
                </Heading>
                <AnswerSheet
                  questions={session.questions}
                  answers={answers}
                  onChange={(i, a) =>
                    setAnswers((old) => old.map((v, j) => (j === i ? a : v)))
                  }
                  onSubmit={submit}
                  listening={phase === "listening"}
                  lang={session.lang}
                />
              </>
            )}

          {phase === "results" && session && (
            <>
              <Heading title="A little more attuned.">
                Review what you caught, and what to listen for next time.
              </Heading>
              <ResultCelebration score={session.score!} effects={effectsOn} />
              <div className="grid grid-cols-3 gap-3 mb-6">
                {[
                  [`${session.score}%`, "Accuracy"],
                  [`+${session.xp}`, "Practice XP"],
                  [`${session.speed.toFixed(1)}×`, "Listening speed"],
                ].map(([v, l]) => (
                  <Card key={l} className="p-5">
                    <div className="text-2xl sm:text-3xl font-semibold tracking-tight">
                      {v}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-2">
                      {l}
                    </p>
                  </Card>
                ))}
              </div>
              <Card className="p-6 mb-6 flex flex-wrap gap-5 items-center justify-between">
                <div>
                  <h2 className="text-sm font-medium">Next practice</h2>
                  <p className="text-xs text-muted-foreground mt-2">
                    {session.score! >= 85
                      ? `Try ${Math.min(3, session.speed + 0.1).toFixed(1)}× for a little more challenge.`
                      : session.score! >= 60
                        ? "Practice another conversation at this speed."
                        : `Try ${Math.max(0.5, session.speed - 0.2).toFixed(1)}× and follow each speaker’s intention.`}
                  </p>
                </div>
                <Button onClick={reset}>
                  New session
                  <Plus />
                </Button>
              </Card>
              {saveError && (
                <p role="alert" className="text-xs mb-5">
                  Browser storage is unavailable. This result has not been
                  saved.
                </p>
              )}
              <div className="space-y-3">
                {session.questions.map((q, i) => (
                  <ResultQuestion
                    key={i}
                    question={q}
                    answer={session.answers![i]}
                    index={i}
                    lang={session.lang}
                  />
                ))}
                <Card className="p-6">
                  <h2 className="text-sm font-semibold mb-5">
                    Full transcript
                  </h2>
                  <div className="space-y-5">
                    {session.lines.map(([n, t], i) => (
                      <div key={i} className="text-sm leading-6">
                        <span className="font-medium text-xs block mb-1">
                          {n}
                        </span>
                        <p className="text-muted-foreground">{t}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </>
          )}
          {phase === "setup" && view === "library" && (
            <>
              <div className="workspace-welcome">
                <Heading title="Choose a conversation.">
                  Everyday situations. A few details worth catching.
                </Heading>
                <ListeningDoodle variant="library" />
              </div>
              <h2 className="text-sm font-medium mb-4">
                Your saved conversations
              </h2>
              <SavedConversations onUse={useConversation} />
              <h2 className="text-sm font-medium mb-4">Curated scenarios</h2>
              <div className="space-y-3">
                {scenarios.map((s, i) => (
                  <Card key={s.id} className="p-6 flex gap-5 items-center">
                    <div className="size-10 rounded-lg bg-zinc-100 hidden sm:flex items-center justify-center">
                      <Volume2 size={18} />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-sm font-medium">{s.title}</h2>
                      <p className="text-xs text-muted-foreground mt-2">
                        {s.description}
                      </p>
                      <p className="text-[10px] text-zinc-400 mt-3">
                        3 speakers · 6 turns ·{" "}
                        {i === 0 ? "English, Telugu, Hindi" : "English"}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setScenario(s.id);
                        setLang("en");
                        setSource("curated");
                        setCount(3);
                        setView("practice");
                      }}
                    >
                      Practice
                      <ArrowRight />
                    </Button>
                  </Card>
                ))}
              </div>
            </>
          )}
          {phase === "setup" && view === "progress" && (
            <>
              <div className="workspace-welcome">
                <Heading title="Your practice, over time.">
                  A record of showing up and paying attention.
                </Heading>
                <ListeningDoodle variant="progress" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
                {[
                  [String(history.length), "Sessions"],
                  [`${avg}%`, "Average accuracy"],
                  [String(history.reduce((a, h) => a + h.xp, 0)), "Total XP"],
                  [String(getStreak(history)), "Day streak"],
                ].map(([v, l]) => (
                  <Card key={l} className="p-5">
                    <strong className="text-2xl font-semibold">{v}</strong>
                    <p className="text-[11px] text-muted-foreground mt-2">
                      {l}
                    </p>
                  </Card>
                ))}
              </div>
              <Card className="p-6">
                <h2 className="text-sm font-medium mb-4">Session history</h2>
                {history.length ? (
                  history.map((h) => (
                    <div
                      key={h.id}
                      className="flex justify-between py-4 border-t border-border text-xs gap-4"
                    >
                      <div>
                        <p className="font-medium">{h.title}</p>
                        <p className="text-muted-foreground mt-2">
                          {new Date(h.date).toLocaleDateString()} ·{" "}
                          {langs[h.lang]} · {Number(h.speed).toFixed(1)}×
                        </p>
                      </div>
                      <div className="text-right">
                        {h.score}%
                        <p className="text-muted-foreground mt-2">+{h.xp} XP</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <ChartNoAxesColumn className="size-6 text-zinc-300 mx-auto mb-4" />
                    <p className="text-sm">Your first session starts here.</p>
                    <p className="text-xs text-muted-foreground mt-2 mb-5">
                      Complete a practice to see your progress.
                    </p>
                    <Button onClick={() => setView("practice")}>
                      Start practicing
                      <ArrowRight />
                    </Button>
                  </div>
                )}
              </Card>
            </>
          )}
          <footer className="mt-12 border-t border-border pt-5 flex justify-between text-[10px] text-zinc-400">
            <span>attune / listening practice</span>
            <span>One conversation at a time.</span>
          </footer>
        </div>
      </main>
    </div>
  );
}
