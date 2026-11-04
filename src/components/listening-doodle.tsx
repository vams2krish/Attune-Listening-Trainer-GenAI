import { AudioLines, CheckCheck, MessageCircle } from "lucide-react";
export function ListeningDoodle({
  variant = "listen",
}: {
  variant?: "listen" | "library" | "progress";
}) {
  return (
    <div className="listening-doodle" aria-hidden="true">
      <span className="doodle-caption">
        {variant === "library"
          ? "good stories live here"
          : variant === "progress"
            ? "tiny steps. big ears."
            : "all ears, zero distractions"}
      </span>
      <svg viewBox="0 0 300 166" fill="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="157" cy="145" rx="108" ry="10" fill="#e4e4e7" />
        <path
          d="M18 82C18 37 66 14 122 28c48-36 123-14 151 25 25 37 4 88-51 91H80C44 144 18 120 18 82Z"
          fill="#f0f0f2"
        />
        <path
          d="m34 32 3-11 4 11 11 3-11 4-4 11-3-11-11-4 11-3Z"
          fill="white"
          stroke="#a1a1aa"
          strokeWidth="1.5"
        />
        <path d="m261 90 3-8 3 8 8 3-8 3-3 8-3-8-8-3 8-3Z" fill="#18181b" />
        <g className="doodle-pal doodle-pal-back">
          <path
            d="M185 74c-7-23 15-45 38-38 23 7 33 26 24 48l-10 41-50-1-2-50Z"
            fill="white"
            stroke="#18181b"
            strokeWidth="2"
          />
          <path
            d="m196 126-3 16m34-17 9 16"
            stroke="#18181b"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="208" cy="70" r="2.8" fill="#18181b" />
          <circle cx="228" cy="70" r="2.8" fill="#18181b" />
          <path
            d="M212 83q7 8 14-1"
            stroke="#18181b"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="m186 100-13-4m73 1 11-10"
            stroke="#18181b"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>
        <g className="doodle-pal doodle-pal-front">
          <path
            d="M81 68c0-24 20-41 44-41s45 17 45 41v59c-27 14-62 14-89 0V68Z"
            fill="white"
            stroke="#18181b"
            strokeWidth="2.2"
          />
          <path
            d="M76 77V64c0-29 21-44 49-44s50 16 50 44v13"
            stroke="#18181b"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <rect x="68" y="66" width="18" height="34" rx="8" fill="#18181b" />
          <rect x="164" y="66" width="18" height="34" rx="8" fill="#18181b" />
          <path
            d="M100 72q5-7 10 0m28 0q5-7 10 0"
            stroke="#18181b"
            strokeWidth="2.3"
            strokeLinecap="round"
          />
          <path d="M111 90q14 18 29 0" fill="#18181b" />
          <path
            d="m102 134-7 10m53-10 8 10"
            stroke="#18181b"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="m83 106-18 5-8-7m113 4 15 4 8-8"
            stroke="#18181b"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </g>
        <g transform="rotate(8 252 28)">
          <path
            d="M234 12h38a10 10 0 0 1 10 10v14a10 10 0 0 1-10 10h-15l-11 8v-8h-12a10 10 0 0 1-10-10V22a10 10 0 0 1 10-10Z"
            fill="#18181b"
          />
          <path
            d="M239 29h4m8 0h4m8 0h4"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </g>
        <path
          d="m29 112 9-5m-4 19 10-2m190-12 7 5"
          stroke="#a1a1aa"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
export function ListeningTrail() {
  const steps = [
    {
      icon: MessageCircle,
      title: "Set the scene",
      detail: "A little everyday chaos.",
    },
    {
      icon: AudioLines,
      title: "Tune in",
      detail: "One listen. Catch the details.",
    },
    {
      icon: CheckCheck,
      title: "Connect the dots",
      detail: "Answer, learn, do it again.",
    },
  ];
  return (
    <div className="listening-trail" aria-label="How practice works">
      {steps.map((step, i) => (
        <div className="trail-step" key={step.title}>
          <div className={`trail-icon trail-icon-${i}`}>
            <step.icon size={19} strokeWidth={1.7} />
            <span>{i + 1}</span>
          </div>
          <div>
            <p className="text-xs font-medium">{step.title}</p>
            <p className="text-[10px] text-muted-foreground mt-1 leading-4">
              {step.detail}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
