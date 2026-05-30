import test from "node:test";
import assert from "node:assert/strict";
import { buildHabitCoachMessages } from "./prompts";
import { summarizeActivityHistory } from "./habitSummary";

test("summarizeActivityHistory counts recent coach task completion", () => {
  const summary = summarizeActivityHistory({
    "2026-05-10": {
      isPeriod: true,
      symptoms: ["cramp"],
      tasks: [{ coachPlanId: "old", done: false }],
    },
    "2026-05-20": {
      isPeriod: true,
      symptoms: ["fatigue", "fatigue"],
      tasks: [
        { coachPlanId: "plan-1", done: true },
        { coachPlanId: "plan-1", done: false },
        { done: true },
      ],
    },
  });

  assert.equal(summary.daysObserved, 2);
  assert.equal(summary.periodDays, 2);
  assert.equal(summary.symptomCounts.fatigue, 2);
  assert.equal(summary.coachTaskCompletionRate, 33);
});

test("buildHabitCoachMessages keeps habit coach role separate from diagnosis", () => {
  const messages = buildHabitCoachMessages({
    nickname: "Maya",
    mode: "initial",
    answers: [{ question: "Target?", answer: "Promil aktif" }],
    cycleSnapshot: { currentPhase: "Luteal" },
    previousSummary: {},
  });

  assert.equal(messages[0].role, "system");
  assert.match(messages[0].content, /Jangan memberi diagnosis medis/);
  assert.match(messages[0].content, /Output wajib JSON valid/);

  const userPayload = JSON.parse(messages[1].content);
  assert.equal(userPayload.nickname, "Maya");
  assert.equal(userPayload.mode, "initial");
  assert.equal(userPayload.answers[0].answer, "Promil aktif");
});
