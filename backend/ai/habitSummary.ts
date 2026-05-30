export function summarizeActivityHistory(activityHistory: Record<string, any>) {
  const entries = Object.entries(activityHistory || {}).sort(([a], [b]) => a.localeCompare(b));
  const last14 = entries.slice(-14);
  const symptoms: Record<string, number> = {};
  let totalTasks = 0;
  let completedTasks = 0;
  let periodDays = 0;

  for (const [, record] of last14) {
    if (record?.isPeriod) periodDays += 1;

    for (const symptom of record?.symptoms || []) {
      symptoms[symptom] = (symptoms[symptom] || 0) + 1;
    }

    for (const task of record?.tasks || []) {
      if (task?.coachPlanId) {
        totalTasks += 1;
        if (task.done) completedTasks += 1;
      }
    }
  }

  return {
    daysObserved: last14.length,
    periodDays,
    symptomCounts: symptoms,
    coachTaskCompletionRate:
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : null,
  };
}
