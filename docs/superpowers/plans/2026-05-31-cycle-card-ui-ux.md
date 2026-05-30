# CycleCard UI/UX Prediction Confidence Improvement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the cycle card layout to present estimated cycle lengths and prediction confidence ratings with clear visual hierarchy, avoiding user confusion about the 28-day default fallback.

**Architecture:** Conditional rendering inside `CycleCard.tsx` based on `cycleConfidence`.
- For `low` confidence: Render a supportive pink-tinted capsule badge "Siklus Perkiraan: {predictedCycleLength} hari" and a soft educational tip.
- For `medium`/`high` confidence: Render a teal-tinted capsule badge "Panjang Siklus: {predictedCycleLength} hari" and the dynamic confidence message.

**Tech Stack:** React Native, Expo, NativeWind (Tailwind CSS for React Native)

---

### Task 1: Update CycleCard component UI/UX rendering

**Files:**
- Modify: `mobile-app/components/dashboard/CycleCard.tsx`

- [ ] **Step 1: Replace the uniform prediction info block with the new hierarchical design**

In `mobile-app/components/dashboard/CycleCard.tsx`, locate lines 62 to 71:
```tsx
      <View className="mt-4 items-center justify-center px-5 py-3 bg-surface-variant/60 rounded-2xl border border-outline-variant/40 z-10">
        <Text className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
          {confidenceMessage} - {predictedCycleLength} hari
        </Text>
        {deltaMessage && (
          <Text className="text-[11px] text-on-surface-variant text-center leading-relaxed mt-1">
            {deltaMessage}
          </Text>
        )}
      </View>
```

And replace it with:
```tsx
      <View className="mt-4 items-center justify-center px-5 py-3 bg-surface-variant/60 rounded-2xl border border-outline-variant/40 z-10 w-full max-w-[280px]">
        {cycleConfidence === 'low' ? (
          <View className="items-center">
            <View className="bg-pink-100/50 px-3 py-1 rounded-full border border-pink-200/30 mb-2">
              <Text className="text-[11px] text-primary font-bold tracking-wider uppercase">
                Siklus Perkiraan: {predictedCycleLength} hari
              </Text>
            </View>
            <Text className="text-[10px] text-on-surface-variant text-center leading-relaxed font-medium">
              💡 Catat tanggal haid di Kalender untuk prediksi personal yang lebih akurat.
            </Text>
          </View>
        ) : (
          <View className="items-center">
            <View className="bg-secondary/10 px-3 py-1 rounded-full border border-secondary/20 mb-2">
              <Text className="text-[11px] text-secondary font-bold tracking-wider uppercase">
                Panjang Siklus: {predictedCycleLength} hari
              </Text>
            </View>
            <Text className="text-[10px] text-on-surface-variant text-center leading-relaxed font-medium">
              ✨ {confidenceMessage}
            </Text>
          </View>
        )}
        {deltaMessage && (
          <Text className="text-[11px] text-on-surface-variant text-center leading-relaxed mt-2 border-t border-outline-variant/30 pt-2 w-full">
            {deltaMessage}
          </Text>
        )}
      </View>
```

- [ ] **Step 2: Verify typescript compilation**

Run type checks to verify everything compiles:
Run: `npm run lint`
Expected: Success with no TypeScript compile or linter errors in mobile components.

- [ ] **Step 3: Commit changes**

```bash
git add mobile-app/components/dashboard/CycleCard.tsx
git commit -m "style: separate cycle card prediction fallback and confidence message visually"
```
