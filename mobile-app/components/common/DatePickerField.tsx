import React, { useMemo, useState } from "react";
import { View, Text, TouchableOpacity, Modal, ScrollView, Platform } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";

export interface DatePickerFieldProps {
  /** Currently selected date (or null when nothing chosen yet). */
  value: Date | null;
  /** Called with a fresh `Date` whenever the user picks/changes the value. */
  onChange: (date: Date) => void;
  /** Lowest year shown in the year column (native picker only). */
  minYear?: number;
  /** Highest year shown in the year column (native picker only). */
  maxYear?: number;
  /** Placeholder shown when no date is selected. */
  placeholder?: string;
  /** Optional helper text below the input (small, muted). */
  helper?: string;
}

const MONTHS_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

function toIsoDate(d: Date | null): string {
  if (!d || isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear().toString().padStart(4, "0");
  const mm = (d.getMonth() + 1).toString().padStart(2, "0");
  const dd = d.getDate().toString().padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatLong(d: Date | null, placeholder: string): string {
  if (!d || isNaN(d.getTime())) return placeholder;
  return `${d.getDate()} ${MONTHS_ID[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Cross-platform single-tap date picker.
 *
 * - Web → renders a native HTML `<input type="date">`. The user gets the
 *   browser's calendar widget for free.
 * - iOS / Android → opens a 3-column scroll-picker modal (day, month, year).
 *   This avoids requiring an extra native dependency for now.
 */
export function DatePickerField({
  value,
  onChange,
  minYear,
  maxYear,
  placeholder = "Pilih Tanggal",
  helper,
}: DatePickerFieldProps) {
  // ---------- Web ----------
  if (Platform.OS === "web") {
    return (
      <View>
        {/*
          Render the actual <input type="date"> via createElement so RN-Web
          doesn't try to map it to a TextInput. We style the wrapper to look
          like the rest of the form fields.
        */}
        <View
          style={{
            backgroundColor: "#fce7f3",
            borderColor: "#fbcfe8",
            borderWidth: 1,
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 12,
          }}
        >
          {React.createElement("input" as any, {
            type: "date",
            value: toIsoDate(value),
            min: minYear ? `${minYear}-01-01` : undefined,
            max: maxYear ? `${maxYear}-12-31` : undefined,
            onChange: (e: any) => {
              const v = e?.target?.value;
              if (!v) return;
              const [yy, mm, dd] = v.split("-").map(Number);
              const d = new Date(yy, (mm || 1) - 1, dd || 1);
              if (!isNaN(d.getTime())) onChange(d);
            },
            style: {
              width: "100%",
              border: "none",
              outline: "none",
              background: "transparent",
              fontSize: 14,
              color: "#1e1b20",
              fontFamily: "inherit",
            },
          })}
        </View>
        {helper && <Text style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>{helper}</Text>}
      </View>
    );
  }

  // ---------- Native (iOS / Android) ----------
  return (
    <NativeWheelDatePicker
      value={value}
      onChange={onChange}
      minYear={minYear}
      maxYear={maxYear}
      placeholder={placeholder}
      helper={helper}
    />
  );
}

function NativeWheelDatePicker({
  value,
  onChange,
  minYear,
  maxYear,
  placeholder,
  helper,
}: Required<Pick<DatePickerFieldProps, "value" | "onChange">> &
  Omit<DatePickerFieldProps, "value" | "onChange">) {
  const today = new Date();
  const yMin = minYear ?? today.getFullYear() - 80;
  const yMax = maxYear ?? today.getFullYear() + 1;

  const [open, setOpen] = useState(false);
  const [tmpDay, setTmpDay] = useState<number>(value?.getDate() ?? today.getDate());
  const [tmpMonth, setTmpMonth] = useState<number>((value?.getMonth() ?? today.getMonth()) + 1);
  const [tmpYear, setTmpYear] = useState<number>(value?.getFullYear() ?? today.getFullYear());

  const years = useMemo(() => {
    const out: number[] = [];
    for (let y = yMax; y >= yMin; y--) out.push(y);
    return out;
  }, [yMin, yMax]);

  const days = useMemo(() => Array.from({ length: 31 }, (_, i) => i + 1), []);

  const openModal = () => {
    if (value) {
      setTmpDay(value.getDate());
      setTmpMonth(value.getMonth() + 1);
      setTmpYear(value.getFullYear());
    }
    setOpen(true);
  };

  const confirm = () => {
    const d = new Date(tmpYear, tmpMonth - 1, tmpDay);
    if (!isNaN(d.getTime()) && d.getDate() === tmpDay) {
      onChange(d);
      setOpen(false);
    }
  };

  return (
    <View>
      <TouchableOpacity
        onPress={openModal}
        style={{
          backgroundColor: "#fce7f3",
          borderColor: "#fbcfe8",
          borderWidth: 1,
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 12,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text
          style={{
            fontSize: 14,
            color: value ? "#1e1b20" : "#94a3b8",
            fontWeight: value ? "600" : "400",
          }}
        >
          {formatLong(value, placeholder ?? "Pilih Tanggal")}
        </Text>
        <FontAwesome name="calendar" size={16} color="#ec4899" />
      </TouchableOpacity>

      {helper && <Text style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>{helper}</Text>}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.45)",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 24,
              padding: 16,
              width: "100%",
              maxWidth: 360,
              gap: 12,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottomWidth: 1,
                borderBottomColor: "#f1e6eb",
                paddingBottom: 10,
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: "bold", color: "#1e1b20" }}>
                Pilih Tanggal
              </Text>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <FontAwesome name="times" size={18} color="#ec4899" />
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: "row", height: 220, gap: 8 }}>
              <WheelColumn
                title="Hari"
                items={days.map((d) => ({ label: String(d), value: d }))}
                selected={tmpDay}
                onSelect={setTmpDay}
              />
              <WheelColumn
                title="Bulan"
                items={MONTHS_ID.map((m, i) => ({ label: m, value: i + 1 }))}
                selected={tmpMonth}
                onSelect={setTmpMonth}
                flex={1.5}
              />
              <WheelColumn
                title="Tahun"
                items={years.map((y) => ({ label: String(y), value: y }))}
                selected={tmpYear}
                onSelect={setTmpYear}
              />
            </View>

            <TouchableOpacity
              onPress={confirm}
              style={{
                backgroundColor: "#ec4899",
                borderRadius: 14,
                paddingVertical: 12,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "bold",
                  color: "#fff",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                Konfirmasi
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

interface WheelColumnProps<T extends number | string> {
  title: string;
  items: { label: string; value: T }[];
  selected: T;
  onSelect: (v: T) => void;
  flex?: number;
}

function WheelColumn<T extends number | string>({
  title,
  items,
  selected,
  onSelect,
  flex = 1,
}: WheelColumnProps<T>) {
  return (
    <View
      style={{
        flex,
        backgroundColor: "#fcf8fa",
        borderRadius: 14,
        overflow: "hidden",
      }}
    >
      <Text
        style={{
          fontSize: 10,
          textAlign: "center",
          fontWeight: "bold",
          color: "#ec4899",
          paddingVertical: 4,
          borderBottomWidth: 1,
          borderBottomColor: "#f1e6eb",
          textTransform: "uppercase",
          letterSpacing: 1,
        }}
      >
        {title}
      </Text>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ padding: 4 }}>
          {items.map((it) => {
            const sel = it.value === selected;
            return (
              <TouchableOpacity
                key={String(it.value)}
                onPress={() => onSelect(it.value)}
                style={{
                  paddingVertical: 8,
                  borderRadius: 10,
                  alignItems: "center",
                  backgroundColor: sel ? "#ec4899" : "transparent",
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: sel ? "bold" : "400",
                    color: sel ? "#fff" : "#1e1b20",
                  }}
                >
                  {it.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
