# Attune Listening Trainer [Gen AI]

**Generate a conversation. Listen once. Answer as you listen.**

Attune is a multilingual listening-practice app for auditory attention, speaker recognition, working memory, and precise recall. Describe a scenario, write your own dialogue, or choose a curated conversation. OpenRouter generates dialogue; ElevenLabs converts it into multi-speaker speech. An IELTS-style answer sheet stays usable while the recording plays, and feedback unlocks after the complete question set is submitted.

![Attune workspace](docs/images/attune-overview.png)

## Project classification

**Generative AI application — LLM + neural text-to-speech.** Attune integrates pretrained language and speech models through OpenRouter and ElevenLabs. These providers use deep-learning models. This repository does **not** train or fine-tune a new ML/DL model; it contains no model weights or training dataset. Question construction and answer grading are deterministic application code.

## Features

- **Generate with AI:** describe a real-life situation; choose English, Telugu, or Hindi, 2–6 speakers, and 6, 10, or 14 turns.
- **Write or paste text:** enter a title and `Speaker: dialogue` turns or import a `.txt` file.
- **Review and save:** edit generated text, save conversations in your browser-local Library, and load them for later speech practice.
- **Multilingual speech:** assign distinct ElevenLabs voices. `eleven_v3` supports English, Hindi, and Telugu without installed operating-system voices. Device speech is an optional English-only alternative.
- **Prepare, then listen:** render MP3 audio before starting. Scored playback has no in-app pause, stop, scrub, or replay controls.
- **Listen and answer:** IELTS-style mode keeps questions usable during audio. Submission stays locked until the recording ends and all questions are complete.
- **Memory practice:** an alternate mode hides questions until the audio finishes.
- **Delayed feedback:** score, XP, explanations, correct answers, full transcript, and suggested next speed appear after submission.
- **Progress:** completed sessions, average accuracy, XP, and day streaks stay in browser-local storage.
- **Adjustable speed:** 0.5×–3.0× playback, with 1.0× as the default.

### Question formats

| Format | Interaction |
| --- | --- |
| Multiple choice | Select the correct speaker or detail |
| Fill in the blank | Type a missing spoken word |
| True / false | Judge a speaker/statement attribution |
| Speaker matching | Match multiple statements to speakers |
| Short answer | Type a concise recall answer |
| Turn ordering | Place three turns in the order heard |

Curated scenarios add detail, inference, and sequence questions. Grading accepts harmless case, punctuation, and whitespace differences. Partial matching and ordering answers are blocked; ordering must use every turn once.

![Live answer sheet](docs/images/live-answer-sheet.png)

## Product flow

1. In **Practice**, select **Scenarios**, **Write or paste text**, or **Generate with AI**.
2. Describe a scene and choose the language, speakers, and length.
3. Review the generated dialogue. Choose **Save for later** or **Use for listening**.
4. Select **Listen and answer — IELTS style** or **Listen first, answer from memory**.
5. Assign different voices, set playback speed, and click **Prepare audio**.
6. Click **Start listening**. In live mode, answer while the conversation unfolds.
7. Finish every answer and submit after playback. Review feedback and the transcript.
8. Open **Progress** for history or **Library** for saved dialogue.

This independent practice tool is inspired by listening-exam interaction. It is not an official IELTS product, complete IELTS exam simulator, or IELTS band-score predictor.

## Stack and architecture

| Layer | Technology |
| --- | --- |
| Interface | React 19, TypeScript, Tailwind CSS 4, local shadcn/ui components, Radix, Lucide |
| Framework | Next.js App Router conventions through Vinext, Vite 8 |
| Runtime | Cloudflare Workers through Sites |
| Dialogue generation | Server-side OpenRouter Chat Completions with JSON Schema output |
| Default LLM | `google/gemini-3.8-flash`; configurable with `OPENROUTER_MODEL` |
| Speech | ElevenLabs Text to Dialogue, `eleven_v3` |
| Playback | Browser audio object with selected playback rate and no exposed controls |
| Persistence | Browser localStorage for saved dialogue and history |
| Tests | Node test runner for grading, completeness, and Unicode handling |

```text
Prompt → /api/generate → OpenRouter → validated dialogue → editable preview
Dialogue + voices → /api/speech → ElevenLabs → MP3 → one-pass playback
Dialogue → mixed question set → live answer sheet → grading
Completed sessions / saved dialogue → browser localStorage
```

Provider requests run on authenticated server routes. Keys never belong in the browser bundle. The server validates origin and input bounds, applies timeouts, and rejects overlapping generation requests per user within a Worker instance. Provider-side key limits cap account usage. Existing owner-private hosted access is preserved; publishing this repository does not make the hosted app public.

## Local setup

Use **Node.js 22.13+** and npm. Provider accounts need valid API access and available credits.

```sh
npm install
cp .env.example .env.local
npm run dev
```

On PowerShell, use `Copy-Item .env.example .env.local`. Put credentials only in the ignored environment file. The development server prints its local URL, normally port 5173. The supplied Sites plugin provides mock local sign-in; production uses Sites authentication.

| Variable | Purpose |
| --- | --- |
| `OPENROUTER_API_KEY` | Conversation generation |
| `ELEVENLABS_API_KEY` | Multi-speaker speech |
| `OPENROUTER_MODEL` | Optional model override |

ElevenLabs permissions: Text to Speech, Voices Read, and Models. Configure provider/key usage limits for your budget. Do not commit `.env.local`, `.dev.vars`, or keys. In production, configure hosted secrets and deploy again to apply changes.

```sh
npx tsc --noEmit
npm test
npm run build
```

The build emits Worker and client assets under `dist/`. Preserve the supplied Sites Vite integration. The public repository includes a neutral hosting manifest without the original private Site identity; configure your own Site before publishing another instance.

## Source map

```text
app/api/generate/          OpenRouter dialogue generation
app/api/voices/            ElevenLabs voice discovery
app/api/speech/            MP3 generation
app/api/status/            Non-secret provider readiness
app/chatgpt-auth.ts        Hosted/local identity helpers
src/App.tsx                Practice, playback, review, library, progress
src/components/            Conversation studio and live answer sheet
src/components/ui/         Owned UI primitives
src/lib/questions.ts       Construction, completeness, and grading
lib/training-api.ts        Authorization, validation, provider errors
worker/                    Cloudflare runtime entry
scripts/                   Framework and Sites build tooling
tests/                     Focused grading and Unicode tests
docs/images/               Real product screenshots
```

## Verification

- Real OpenRouter generation was exercised through the UI and saved for later listening.
- Real ElevenLabs audio was prepared and played in a scored session.
- All six question formats were answered while the recording played. Submission remained locked until audio completion, then correctly graded 100% and 90 XP.
- Hindi and Telugu speech routes returned actual MP3 audio successfully without system voice installation.
- Automated tests cover partial/duplicate ordering, matching, normalized answers, and Telugu combining marks.

## Limits and privacy

- Speech requests allow up to 2,000 spoken characters. Imported/written dialogue supports 4–30 turns; generated dialogue uses 6, 10, or 14 turns.
- Pronunciation and voice quality come from the speech provider. Automated checks verify output and playback lifecycle, not human-perceived accent or intelligibility.
- Prompts go to OpenRouter and the selected model provider. Dialogue goes to ElevenLabs. Saved dialogue and progress remain local; cross-device sync is not implemented.
- In-app controls enforce one-pass practice. Browser developer tools, operating-system controls, and device failures remain outside that boundary. Interrupted attempts are discarded.
- Custom/generated dialogue currently uses deterministic questions. Open-ended semantic answers are not graded by an LLM. Instructions and feedback are in English.
- Offline AI generation is not implemented. Audio is temporary for the current session, not permanently archived.
- XP and streaks support consistency. The app makes no clinical or validated cognitive-improvement claim.

## Documentation

- [OpenRouter Chat Completions](https://openrouter.ai/docs/api/api-reference/chat/create-a-chat-completion)
- [ElevenLabs Text to Dialogue](https://elevenlabs.io/docs/api-reference/text-to-dialogue/convert)
- [ElevenLabs voice discovery](https://elevenlabs.io/docs/api-reference/voices/search)

Third-party starter/vendor licenses are retained alongside their files.
