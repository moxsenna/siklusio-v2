import test from "node:test";
import assert from "node:assert/strict";
import { buildHabitCoachMessages } from "./prompts";
import { summarizeActivityHistory } from "./habitSummary";
import {
  hasDateRangeOverlap,
  isValidHabitCoachWindow,
  shouldReplaceActivePlan,
} from "./habitCoachWindow";
import {
  buildHabitCoachActiveOverlapConflict,
  saveHabitCoachPlanWithCharge,
} from "./habitCoachPlanLifecycle";

const makeLifecycleTask = (id: string, category = "nutrition") => ({
  id,
  text: `Personalized task ${id}`,
  emoji: "sparkles",
  category,
  reason: "Supaya kebiasaan kecil terasa realistis.",
});

const makeLifecycleDays = () =>
  Array.from({ length: 7 }, (_, index) => ({
    focus: `Fokus ${index + 1}`,
    tasks: [
      makeLifecycleTask(`protein-${index}`),
      makeLifecycleTask(`journal-${index}`, "promil"),
      makeLifecycleTask(`breath-${index}`, "emotional"),
    ],
  }));

const lifecycleDateKeys = [
  "2026-05-31",
  "2026-06-01",
  "2026-06-02",
  "2026-06-03",
  "2026-06-04",
  "2026-06-05",
  "2026-06-06",
];

function createLifecycleSupabaseMock(
  options: {
    archiveError?: Error;
    deleteArchivedConflictError?: Error;
    activateError?: Error;
    insertDaysError?: Error;
  } = {},
) {
  const calls: string[] = [];

  const supabaseAdmin = {
    from(table: string) {
      if (table === "habit_coach_plans") {
        return {
          insert(payload: Record<string, unknown>) {
            calls.push("insert-plan");
            return {
              select() {
                return {
                  async single() {
                    return {
                      data: {
                        id: "new-plan",
                        ...payload,
                      },
                      error: null,
                    };
                  },
                };
              },
            };
          },
          update(payload: Record<string, unknown>) {
            if (payload.status === "archived") {
              return {
                eq() {
                  return this;
                },
                async in() {
                  calls.push("archive-plans");
                  return { data: null, error: options.archiveError || null };
                },
              };
            }

            return {
              eq(column: string) {
                if (column === "id") {
                  calls.push("activate-plan");
                  return {
                    select() {
                      return {
                        async single() {
                          return {
                            data: { id: "new-plan", status: "active" },
                            error: options.activateError || null,
                          };
                        },
                      };
                    },
                  };
                }

                return this;
              },
              async in() {
                calls.push("restore-active-plans");
                return { data: null, error: null };
              },
            };
          },
          delete() {
            return {
              eq(column: string) {
                if (column === "id") {
                  calls.push("delete-new-plan");
                  return { data: null, error: null };
                }

                return this;
              },
              async in() {
                calls.push("delete-archived-conflicts");
                return { data: null, error: options.deleteArchivedConflictError || null };
              },
            };
          },
        };
      }

      if (table === "habit_coach_plan_days") {
        return {
          async insert(rows: unknown[]) {
            calls.push("insert-days");
            return { data: rows, error: options.insertDaysError || null };
          },
        };
      }

      throw new Error(`Unexpected table ${table}`);
    },
  };

  return { calls, supabaseAdmin };
}

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
  const cycleDays = [
    {
      dateKey: "2026-05-31",
      dayIndex: 1,
      phase: "Menstrual",
      displayPhase: "Menstruasi",
      cycleDay: 2,
      isManualPeriod: true,
    },
  ];
  const messages = buildHabitCoachMessages({
    nickname: "Maya",
    mode: "initial",
    answers: [{ question: "Target?", answer: "Promil aktif" }],
    cycleSnapshot: { currentPhase: "Luteal" },
    cycleDays,
    previousSummary: {},
  });

  assert.equal(messages[0].role, "system");
  assert.match(messages[0].content, /Jangan memberi diagnosis medis/);
  assert.match(messages[0].content, /Output wajib JSON valid/);

  const userPayload = JSON.parse(messages[1].content);
  assert.equal(userPayload.nickname, "Maya");
  assert.equal(userPayload.mode, "initial");
  assert.equal(userPayload.answers[0].answer, "Promil aktif");
  assert.deepEqual(userPayload.cycleDays, cycleDays);
  assert.match(userPayload.rules.join(" "), /coachSummary/i);
});

test("buildHabitCoachMessages tells AI to use cycleDays and avoid foundation duplicates", () => {
  const messages = buildHabitCoachMessages({
    nickname: "Maya",
    mode: "renewal",
    answers: [],
    cycleSnapshot: { currentPhase: "Follicular" },
    cycleDays: [
      {
        dateKey: "2026-06-01",
        dayIndex: 1,
        phase: "Follicular",
        displayPhase: "Folikular",
        cycleDay: 8,
        isManualPeriod: false,
      },
      {
        dateKey: "2026-06-02",
        dayIndex: 2,
        phase: "Ovulation",
        displayPhase: "Ovulasi",
        cycleDay: 14,
        isManualPeriod: false,
      },
    ],
    previousSummary: {},
  });

  const userPayload = JSON.parse(messages[1].content);
  const rules = userPayload.rules.join(" ");

  assert.match(rules, /cycleDays/i);
  assert.match(rules, /fase aktual setiap tanggal/i);
  assert.match(rules, /3 sampai 5 habit personal tambahan/i);
  assert.match(rules, /Jangan duplikasi/i);
  assert.match(rules, /hidrasi/i);
  assert.match(rules, /fondasi fase/i);
});

test("isValidHabitCoachWindow requires a seven-day continuous request window", () => {
  assert.equal(
    isValidHabitCoachWindow({
      weekStart: "2026-05-31",
      weekEnd: "2026-06-06",
      dateKeys: [
        "2026-05-31",
        "2026-06-01",
        "2026-06-02",
        "2026-06-03",
        "2026-06-04",
        "2026-06-05",
        "2026-06-06",
      ],
    }),
    true,
  );

  assert.equal(
    isValidHabitCoachWindow({
      weekStart: "2026-05-31",
      weekEnd: "2026-06-06",
      dateKeys: [
        "2026-06-01",
        "2026-06-02",
        "2026-06-03",
        "2026-06-04",
        "2026-06-05",
        "2026-06-06",
        "2026-06-07",
      ],
    }),
    false,
  );

  assert.equal(
    isValidHabitCoachWindow({
      weekStart: "2026-05-31",
      weekEnd: "2026-06-06",
      dateKeys: [
        "2026-05-31",
        "2026-06-01",
        "2026-06-01",
        "2026-06-03",
        "2026-06-04",
        "2026-06-05",
        "2026-06-06",
      ],
    }),
    false,
  );

  assert.equal(
    isValidHabitCoachWindow({
      weekStart: "2026-05-31",
      weekEnd: "2026-06-06",
      dateKeys: [
        "2026-05-31",
        "2026-06-01",
        "2026-06-02",
        "2026-06-04",
        "2026-06-05",
        "2026-06-06",
        "2026-06-06",
      ],
    }),
    false,
  );
});

test("hasDateRangeOverlap detects active plan conflicts", () => {
  assert.equal(
    hasDateRangeOverlap({
      start: "2026-05-31",
      end: "2026-06-06",
      otherStart: "2026-06-03",
      otherEnd: "2026-06-09",
    }),
    true,
  );

  assert.equal(
    hasDateRangeOverlap({
      start: "2026-05-31",
      end: "2026-06-06",
      otherStart: "2026-06-07",
      otherEnd: "2026-06-13",
    }),
    false,
  );
});

test("buildHabitCoachActiveOverlapConflict returns 409 payload with latest activeUntil", () => {
  const conflict = buildHabitCoachActiveOverlapConflict({
    activeOverlaps: [
      { id: "plan-early", week_end: "2026-06-06" },
      { id: "plan-latest", week_end: "2026-06-13" },
    ],
    replaceActivePlan: false,
    fallbackWeekEnd: "2026-06-06",
  });

  assert.equal(conflict?.code, "ACTIVE_PLAN_OVERLAP");
  assert.equal(conflict?.activeUntil, "2026-06-13");
  assert.equal(conflict?.planId, "plan-latest");
  assert.match(conflict?.message || "", /Rencana habit aktif masih berlaku sampai 2026-06-13/);
  assert.match(
    conflict?.message || "",
    /membangun ulang rencana mulai hari ini sampai 7 hari ke depan/,
  );
  assert.equal(conflict?.error, conflict?.message);

  assert.equal(
    buildHabitCoachActiveOverlapConflict({
      activeOverlaps: [{ id: "plan-1", week_end: "2026-06-06" }],
      replaceActivePlan: true,
      fallbackWeekEnd: "2026-06-06",
    }),
    null,
  );
});

test("saveHabitCoachPlanWithCharge archives before charging replacement plans", async () => {
  const { calls, supabaseAdmin } = createLifecycleSupabaseMock();

  const result = await saveHabitCoachPlanWithCharge({
    supabaseAdmin,
    userId: "user-1",
    replaceActivePlan: true,
    activeOverlaps: [{ id: "old-plan", week_start: "2026-05-25", week_end: "2026-06-06" }],
    dateKeys: lifecycleDateKeys,
    cycleDays: [],
    aiDays: makeLifecycleDays(),
    planInsert: {
      user_id: "user-1",
      week_start: "2026-05-31",
      week_end: "2026-06-06",
      status: "pending_charge",
    },
    async charge(referenceId) {
      calls.push(`charge:${referenceId}`);
      return 450;
    },
  });

  assert.deepEqual(calls, [
    "insert-plan",
    "insert-days",
    "delete-archived-conflicts",
    "archive-plans",
    "activate-plan",
    "charge:new-plan",
  ]);
  assert.equal(result.balance, 450);
  assert.equal(result.plan.habit_coach_plan_days[0].plan_id, "new-plan");
  assert.equal(result.plan.habit_coach_plan_days[0].tasks.length, 5);
});

test("saveHabitCoachPlanWithCharge does not charge when archive fails", async () => {
  const { calls, supabaseAdmin } = createLifecycleSupabaseMock({
    archiveError: new Error("archive failed"),
  });

  await assert.rejects(
    () =>
      saveHabitCoachPlanWithCharge({
        supabaseAdmin,
        userId: "user-1",
        replaceActivePlan: true,
        activeOverlaps: [{ id: "old-plan", week_start: "2026-05-25", week_end: "2026-06-06" }],
        dateKeys: lifecycleDateKeys,
        cycleDays: [],
        aiDays: makeLifecycleDays(),
        planInsert: {
          user_id: "user-1",
          week_start: "2026-05-31",
          week_end: "2026-06-06",
          status: "pending_charge",
        },
        async charge(referenceId) {
          calls.push(`charge:${referenceId}`);
          return 450;
        },
      }),
    /archive failed/,
  );

  assert.deepEqual(calls, [
    "insert-plan",
    "insert-days",
    "delete-archived-conflicts",
    "archive-plans",
    "delete-new-plan",
  ]);
});

test("saveHabitCoachPlanWithCharge cleans up and restores old plan when activation fails", async () => {
  const { calls, supabaseAdmin } = createLifecycleSupabaseMock({
    activateError: new Error("activate failed"),
  });

  await assert.rejects(
    () =>
      saveHabitCoachPlanWithCharge({
        supabaseAdmin,
        userId: "user-1",
        replaceActivePlan: true,
        activeOverlaps: [{ id: "old-plan", week_start: "2026-05-25", week_end: "2026-06-06" }],
        dateKeys: lifecycleDateKeys,
        cycleDays: [],
        aiDays: makeLifecycleDays(),
        planInsert: {
          user_id: "user-1",
          week_start: "2026-05-31",
          week_end: "2026-06-06",
          status: "pending_charge",
        },
        async charge(referenceId) {
          calls.push(`charge:${referenceId}`);
          return 450;
        },
      }),
    /activate failed/,
  );

  assert.deepEqual(calls, [
    "insert-plan",
    "insert-days",
    "delete-archived-conflicts",
    "archive-plans",
    "activate-plan",
    "delete-new-plan",
    "restore-active-plans",
  ]);
});

test("saveHabitCoachPlanWithCharge cleans up and restores old plan when charge fails", async () => {
  const { calls, supabaseAdmin } = createLifecycleSupabaseMock();

  await assert.rejects(
    () =>
      saveHabitCoachPlanWithCharge({
        supabaseAdmin,
        userId: "user-1",
        replaceActivePlan: true,
        activeOverlaps: [{ id: "old-plan", week_start: "2026-05-25", week_end: "2026-06-06" }],
        dateKeys: lifecycleDateKeys,
        cycleDays: [],
        aiDays: makeLifecycleDays(),
        planInsert: {
          user_id: "user-1",
          week_start: "2026-05-31",
          week_end: "2026-06-06",
          status: "pending_charge",
        },
        async charge(referenceId) {
          calls.push(`charge:${referenceId}`);
          throw new Error("charge failed");
        },
      }),
    /charge failed/,
  );

  assert.deepEqual(calls, [
    "insert-plan",
    "insert-days",
    "delete-archived-conflicts",
    "archive-plans",
    "activate-plan",
    "charge:new-plan",
    "delete-new-plan",
    "restore-active-plans",
  ]);
});

test("saveHabitCoachPlanWithCharge fills underbuilt generated days before insert", async () => {
  const { calls, supabaseAdmin } = createLifecycleSupabaseMock();

  const result = await saveHabitCoachPlanWithCharge({
    supabaseAdmin,
    userId: "user-1",
    replaceActivePlan: true,
    activeOverlaps: [{ id: "old-plan", week_start: "2026-05-25", week_end: "2026-06-06" }],
    dateKeys: lifecycleDateKeys,
    cycleDays: [
      {
        dateKey: "2026-05-31",
        phase: "Menstrual",
        displayPhase: "Menstruasi",
        isManualPeriod: true,
      },
    ],
    aiDays: [
      {
        focus: "Underfilled",
        tasks: [
          {
            id: "ai-water",
            text: "Minum air putih 2 liter bertahap",
            emoji: "water",
            category: "hydration",
            reason: "Agar tubuh terhidrasi.",
          },
          {
            id: "ai-warmth",
            text: "Kompres hangat perut bawah 10 menit",
            emoji: "heat",
            category: "rest",
            reason: "Membantu rasa nyaman.",
          },
          makeLifecycleTask("only-one", "emotional"),
        ],
      },
    ],
    planInsert: {
      user_id: "user-1",
      week_start: "2026-05-31",
      week_end: "2026-06-06",
      status: "pending_charge",
    },
    async charge(referenceId) {
      calls.push(`charge:${referenceId}`);
      return 450;
    },
  });

  assert.equal(result.plan.habit_coach_plan_days[0].tasks.length, 5);
  assert.equal(
    result.plan.habit_coach_plan_days[0].tasks.some((task: any) => task.id === "fallback-protein"),
    true,
  );
  assert.equal(calls.includes("charge:new-plan"), true);
});

test("shouldReplaceActivePlan only accepts literal true", () => {
  assert.equal(shouldReplaceActivePlan(true), true);
  assert.equal(shouldReplaceActivePlan(false), false);
  assert.equal(shouldReplaceActivePlan("true"), false);
  assert.equal(shouldReplaceActivePlan(1), false);
  assert.equal(shouldReplaceActivePlan({ value: true }), false);
  assert.equal(shouldReplaceActivePlan(undefined), false);
});
