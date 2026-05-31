export function buildRecipeCycleSnapshot(body: any) {
  return {
    phase: body.phase || "unknown_phase",
    cycleDay: typeof body.cycleDay === "number" ? body.cycleDay : null,
    daysToNextPeriod:
      typeof body.daysToNextPeriod === "number" ? body.daysToNextPeriod : null,
  };
}
