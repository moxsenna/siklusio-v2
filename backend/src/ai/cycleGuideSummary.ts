export function buildCycleGuideSnapshot(body: any) {
  return {
    currentPhase: body.currentPhase,
    cycleDay: body.cycleDay,
    daysToNextPeriod: body.daysToNextPeriod,
    fertileWindow: body.fertileWindow,
    ovulationDate: body.ovulationDate,
    nextPeriodDate: body.nextPeriodDate,
    cycleConfidence: body.cycleConfidence,
    periodConfidence: body.periodConfidence,
    lastPredictionDeltaDays: body.lastPredictionDeltaDays,
    guideLevel: body.guideLevel,
  };
}
