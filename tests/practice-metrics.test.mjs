import test from "node:test";
import assert from "node:assert/strict";
import {
  practiceXp,
  practiceStreak,
  skillMatrix,
} from "../src/lib/practice-metrics.ts";
test("XP rounds the total once and rewards correct answers only", () => {
  assert.equal(practiceXp(8, 1), 120);
  assert.equal(practiceXp(0, 2), 0);
  assert.equal(practiceXp(3, 1.5), 51);
});
test("streak counts distinct local days with a grace day and handles a gap", () => {
  const now = new Date(2026, 10, 4, 12);
  const entry = (n) => ({ date: new Date(2026, 10, n, 12).toISOString() });
  assert.equal(
    practiceStreak([entry(4), entry(4), entry(3), entry(2)], now),
    3,
  );
  assert.equal(practiceStreak([entry(3), entry(2)], now), 2);
  assert.equal(practiceStreak([entry(2)], now), 0);
});
test("matrix uses question results, with unmeasured skills left empty", () => {
  const rows = skillMatrix(
    [
      { kind: "mcq", answer: "yes", options: ["yes", "no"] },
      { kind: "short", answer: "train" },
    ],
    [true, false],
  );
  assert.equal(rows[0].percent, 100);
  assert.equal(rows[1].percent, 0);
  assert.equal(rows[2].percent, null);
});

test("speech cache separates changed text, voice, and language while reusing exact requests", async () => {
  const { speechCacheKey } = await import("../src/lib/speech-cache.ts");
  const request = {
    lang: "en",
    inputs: [{ text: "A station conversation.", voice_id: "voice-a" }],
  };
  const key = await speechCacheKey(JSON.stringify(request));
  assert.equal(key, await speechCacheKey(JSON.stringify(request)));
  for (const changed of [
    { ...request, lang: "hi" },
    {
      ...request,
      inputs: [{ ...request.inputs[0], text: "A changed conversation." }],
    },
    { ...request, inputs: [{ ...request.inputs[0], voice_id: "voice-b" }] },
  ])
    assert.notEqual(key, await speechCacheKey(JSON.stringify(changed)));
});
