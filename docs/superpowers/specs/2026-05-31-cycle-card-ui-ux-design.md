# Design Spec: CycleCard UI/UX Improvement for Prediction Confidence

**Date**: 2026-05-31
**Status**: Approved
**Feature**: Menstrual Cycle Prediction & Dashboard Card

---

## 1. Background & Problem Statement
Currently, on the mobile app's dashboard, the menstrual cycle prediction card (rendered by `CycleCard.tsx`) displays the prediction confidence and fallback cycle length in a single, uniform uppercase line:
`BUTUH LEBIH BANYAK CATATAN - 28 HARI`

For newly registered users, this is confusing and leads to UX friction because:
1. It combines a dynamic educational warning (`Butuh lebih banyak catatan`) with a static fallback value (`28 hari`) using a simple hyphen, making it look like a single confusing instruction (e.g., "Must log for 28 days").
2. The lack of visual hierarchy fails to separate estimated fallback data from actual calculated/personalized cycle data.

---

## 2. Proposed Design (Option A)
To clarify this state for users, we separate the information into a clear visual hierarchy.

### 2.1 Visual States

#### A. Low Confidence (New Users / Lack of Data)
- **Estimated Cycle Badge**: A soft pill/badge showing "Siklus Perkiraan: 28 hari" styled with a supportive background (pink-tinted) to highlight that this is a starting estimate.
- **Supportive Helper Text**: A friendly, lowercase tip explaining why and how to get personalized predictions:
  *"💡 Catat tanggal haid di Kalender untuk prediksi personal yang lebih akurat."*

#### B. Medium/High Confidence (Active Users / Sufficient Data)
- **Personalized Cycle Badge**: A steady pill/badge showing "Panjang Siklus: {calculatedDays} hari" styled with a teal/secondary background.
- **Dynamic Confidence Message**: Displays the confidence indicator:
  - *"✨ Prediksi mulai personal"* (Medium)
  - *"✨ Pola siklus cukup stabil"* (High)

---

## 3. Implementation Details

### Target File
- `mobile-app/components/dashboard/CycleCard.tsx`

### UI Structure (React Native + NativeWind)
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

---

## 4. Verification Plan
- Verify component syntax compiling without any TypeScript errors.
- Ensure the layout is responsive and text wrapping is handled properly inside the container.
