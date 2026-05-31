export function buildHabitCoachMessages(input: {
  nickname: string;
  mode: "initial" | "renewal";
  answers: Array<{ question: string; answer: string }>;
  cycleSnapshot: Record<string, unknown>;
  previousSummary: Record<string, unknown>;
}) {
  return [
    {
      role: "system" as const,
      content:
        "Kamu adalah Habit Coach promil Siklusio. Buat rencana habit 7 hari yang realistis, hangat, praktis, dan aman. Jangan memberi diagnosis medis, jangan menjanjikan hamil, dan jangan menyuruh tindakan berisiko. Output wajib JSON valid sesuai schema.",
    },
    {
      role: "user" as const,
      content: JSON.stringify({
        nickname: input.nickname,
        mode: input.mode,
        answers: input.answers,
        cycleSnapshot: input.cycleSnapshot,
        previousSummary: input.previousSummary,
        rules: [
          "Setiap hari berisi 3 sampai 5 habit kecil.",
          "Gunakan bahan dan aktivitas yang realistis untuk pengguna Indonesia.",
          "Tulis dalam Bahasa Indonesia dengan kata kamu, bukan Anda.",
          "Habit harus bisa diceklis, spesifik, dan selesai kurang dari 10 menit kecuali user memilih tantangan tinggi.",
          "Jangan membuat plan yang sama persis setiap hari.",
          "coachSummary wajib singkat, cukup 1 sampai 2 kalimat (maksimal 28 kata).",
        ],
      }),
    },
  ];
}

export function buildCycleGuideMessages(input: {
  nickname: string;
  guideLevel: "starter" | "active" | "personal";
  cycleSnapshot: Record<string, unknown>;
  habitSnapshot: Record<string, unknown>;
}) {
  return [
    {
      role: "system" as const,
      content:
        "Kamu adalah Panduan Siklus Siklusio. Jelaskan kondisi siklus dan tanggal penting. Jangan membuat checklist habit baru. Jika perlu aksi, arahkan ke Habit Coach. Jangan memberi diagnosis medis atau janji kehamilan. Output wajib JSON valid sesuai schema.",
    },
    {
      role: "user" as const,
      content: JSON.stringify({
        nickname: input.nickname,
        guideLevel: input.guideLevel,
        cycleSnapshot: input.cycleSnapshot,
        habitSnapshot: input.habitSnapshot,
        tone: "hangat, jelas, singkat, tidak menggurui",
      }),
    },
  ];
}
