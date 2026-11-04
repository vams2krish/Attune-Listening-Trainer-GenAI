"use client";
import { Trophy, Sparkles, CheckCircle2 } from "lucide-react";
export function playResultSound(score: number) {
  try {
    const context = new AudioContext();
    const notes =
      score === 100
        ? [523.25, 659.25, 783.99, 1046.5]
        : score >= 60
          ? [440, 554.37, 659.25]
          : score > 0
            ? [392, 440]
            : [349.23, 349.23];
    void context.resume();
    notes.forEach((frequency, i) => {
      const oscillator = context.createOscillator(),
        gain = context.createGain();
      const start = context.currentTime + i * 0.12;
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.065, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.32);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.34);
    });
    window.setTimeout(() => {
      void context.close();
    }, 1600);
  } catch {
    /* Results remain usable when audio is unavailable. */
  }
}
export function ResultCelebration({
  score,
  effects,
}: {
  score: number;
  effects: boolean;
}) {
  const perfect = score === 100;
  return (
    <div
      className="result-banner relative overflow-hidden rounded-xl border border-border bg-zinc-950 text-white p-6 sm:p-8 mb-6"
      role="status"
    >
      {perfect && effects && (
        <div
          className="celebration-layer pointer-events-none absolute inset-0"
          aria-hidden="true"
        >
          <div className="flare flare-left" />
          <div className="flare flare-right" />
          {Array.from({ length: 28 }, (_, i) => (
            <i
              key={i}
              className="ribbon"
              style={{
                left: `${(i * 37) % 100}%`,
                animationDelay: `${(i % 7) * 0.09}s`,
                background:
                  i % 3 === 0 ? "#d4b978" : i % 2 ? "#fff" : "#a1a1aa",
                transform: `rotate(${i * 23}deg)`,
              }}
            />
          ))}
        </div>
      )}
      <div className="relative flex items-center gap-4">
        <div className="rounded-full border border-white/20 bg-white/10 p-3">
          {perfect ? (
            <Trophy size={26} />
          ) : score >= 60 ? (
            <Sparkles size={26} />
          ) : (
            <CheckCircle2 size={26} />
          )}
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[.2em] text-zinc-400 mb-2">
            Session complete
          </p>
          <h2 className="text-xl font-semibold tracking-tight">
            {perfect
              ? "Every detail. Perfectly caught."
              : score >= 60
                ? "Good listening. Keep building."
                : score > 0
                  ? "Every attempt builds attention."
                  : "A fresh start for your next listen."}
          </h2>
          <p className="text-xs text-zinc-400 mt-2">
            {perfect
              ? "All answers correct. Enjoy the moment."
              : "Review the explanations below, then try another conversation."}
          </p>
        </div>
      </div>
    </div>
  );
}
