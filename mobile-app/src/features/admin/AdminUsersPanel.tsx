import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { format, differenceInYears } from "date-fns";
import { apiGetJson } from "@/src/lib/api";
import { getSupabaseClientStatus } from "@/src/lib/supabaseAccess";
import { supabase } from "@/src/lib/supabase";
import type { AdminUser } from "./adminTypes";
import { escapeCsvCell, formatCsvDateTime, formatRelative } from "./adminUtils";

interface AdminUsersPanelProps {
  isActive: boolean;
  onUserCountChange: (count: number) => void;
}

export default function AdminUsersPanel({ isActive, onUserCountChange }: AdminUsersPanelProps) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  const fetchUsers = async () => {
    const status = getSupabaseClientStatus(supabase);
    if (!status.ready) return;

    setUsersLoading(true);
    setUsersError(null);
    try {
      const data = await apiGetJson<{ users: AdminUser[] }>("/api/admin/users");
      const nextUsers = data.users || [];
      setUsers(nextUsers);
      onUserCountChange(nextUsers.length);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Gagal memuat daftar pengguna.";
      setUsersError(message);
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    if (isActive) {
      fetchUsers();
    }
  }, [isActive]);

  const filteredUsers = useMemo(() => {
    if (!searchTerm) return users;
    const query = searchTerm.toLowerCase();
    return users.filter(
      (u) =>
        (u.email && u.email.toLowerCase().includes(query)) ||
        (u.name && u.name.toLowerCase().includes(query)) ||
        (u.nickname && u.nickname.toLowerCase().includes(query)) ||
        (u.husband_name && u.husband_name.toLowerCase().includes(query)),
    );
  }, [users, searchTerm]);

  const downloadCSV = () => {
    if (users.length === 0) return;
    const headers = [
      "Email",
      "Nama",
      "Panggilan",
      "No. WhatsApp",
      "Terdaftar",
      "Login Terakhir",
      "ID Pengguna",
      "Tanggal Lahir",
      "Usia",
      "Jumlah Anak",
      "HPHT",
      "Panjang Siklus",
      "Lama Haid",
      "Nama Suami",
      "Panggilan Suami",
      "No. WA Suami",
      "Target Tabungan",
      "Tabungan Saat Ini",
      "Admin",
      "Avatar Kind",
      "Avatar URL",
      "Updated At",
    ];
    const rows = users.map((user) => [
      user.email || "",
      user.name || "",
      user.nickname || "",
      user.whatsapp_number || "",
      formatCsvDateTime(user.created_at),
      formatCsvDateTime(user.last_sign_in_at),
      user.id,
      user.birth_date || "",
      user.birth_date ? differenceInYears(new Date(), new Date(user.birth_date)) : "",
      user.children_count || "",
      user.last_period_date || "",
      user.cycle_length || 0,
      user.period_length || 0,
      user.husband_name || "",
      user.husband_nickname || "",
      user.husband_number || "",
      user.target_saving || 0,
      user.current_saving || 0,
      user.is_admin ? "Ya" : "Tidak",
      user.avatar_kind || "",
      user.avatar_url || "",
      formatCsvDateTime(user.updated_at),
    ]);

    const csvContent = [headers, ...rows].map((row) => row.map(escapeCsvCell).join(",")).join("\n");

    if (Platform.OS === "web") {
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `siklusio_users_${format(new Date(), "yyyyMMdd")}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <View style={{ gap: 16 }}>
      <View style={{ flexDirection: "row", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <View
          style={{
            flex: 1,
            minWidth: 200,
            height: 44,
            borderRadius: 22,
            backgroundColor: "#fff",
            borderWidth: 1,
            borderColor: "#f1e6eb",
            paddingHorizontal: 16,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
          }}
        >
          <FontAwesome name="search" size={16} color="#94a3b8" />
          <TextInput
            placeholder="Cari email, nama, atau panggilan..."
            value={searchTerm}
            onChangeText={setSearchTerm}
            style={{ flex: 1, fontSize: 13, color: "#1e1b20" }}
          />
        </View>

        <TouchableOpacity
          onPress={fetchUsers}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: "#fff",
            borderWidth: 1,
            borderColor: "#f1e6eb",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <FontAwesome name="refresh" size={16} color="#ec4899" />
        </TouchableOpacity>

        {Platform.OS === "web" && (
          <TouchableOpacity
            onPress={downloadCSV}
            disabled={users.length === 0}
            style={{
              height: 44,
              paddingHorizontal: 16,
              borderRadius: 22,
              backgroundColor: "#ec4899",
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              opacity: users.length === 0 ? 0.5 : 1,
            }}
          >
            <FontAwesome name="download" size={14} color="#fff" />
            <Text
              style={{
                fontSize: 12,
                fontWeight: "bold",
                color: "#fff",
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              Unduh CSV
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {usersError && (
        <View
          style={{
            backgroundColor: "#fef2f2",
            borderColor: "#fee2e2",
            borderWidth: 1,
            borderRadius: 16,
            padding: 16,
            flexDirection: "row",
            gap: 12,
          }}
        >
          <Text style={{ fontSize: 18 }}>⚠️</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: "bold", color: "#991b1b" }}>
              Gagal Mengambil Data
            </Text>
            <Text style={{ fontSize: 12, color: "#ef4444", marginTop: 4 }}>{usersError}</Text>
          </View>
        </View>
      )}

      {usersLoading ? (
        <View style={{ paddingVertical: 48, alignItems: "center" }}>
          <ActivityIndicator size="large" color="#ec4899" />
        </View>
      ) : filteredUsers.length === 0 ? (
        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 24,
            borderWidth: 1,
            borderColor: "#f1e6eb",
            padding: 32,
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 14, color: "#94a3b8", fontWeight: "bold" }}>
            Tidak ada pengguna ditemukan
          </Text>
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          {filteredUsers.map((user) => {
            const isExpanded = expandedUserId === user.id;
            const registerDate = user.created_at
              ? format(new Date(user.created_at), "dd MMM yyyy HH:mm")
              : "-";
            const userAge = user.birth_date
              ? `${differenceInYears(new Date(), new Date(user.birth_date))} tahun`
              : "-";

            return (
              <View
                key={user.id}
                style={{
                  backgroundColor: "#fff",
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: "#f1e6eb",
                  padding: 16,
                  gap: 12,
                }}
              >
                <TouchableOpacity
                  onPress={() => setExpandedUserId(isExpanded ? null : user.id)}
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <View style={{ gap: 4, flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: "bold", color: "#1e1b20" }}>
                      {user.name || user.nickname || "Tidak Bernama"}
                    </Text>
                    <Text style={{ fontSize: 12, color: "#64748b" }}>
                      {user.email || "Tanpa Email"}
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "bold",
                        color: "#ec4899",
                        backgroundColor: "#fce7f3",
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 12,
                      }}
                    >
                      {user.nickname || "User"}
                    </Text>
                    <FontAwesome
                      name={isExpanded ? "chevron-up" : "chevron-down"}
                      size={14}
                      color="#94a3b8"
                    />
                  </View>
                </TouchableOpacity>

                {isExpanded && (
                  <View
                    style={{
                      borderTopWidth: 1,
                      borderTopColor: "#f8fafc",
                      paddingTop: 12,
                      gap: 8,
                    }}
                  >
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <Text style={{ fontSize: 12, color: "#64748b" }}>ID Pengguna</Text>
                      <Text style={{ fontSize: 12, fontFamily: "monospace", color: "#1e1b20" }}>
                        {user.id.split("-")[0]}...
                      </Text>
                    </View>
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <Text style={{ fontSize: 12, color: "#64748b" }}>No. WhatsApp</Text>
                      <Text style={{ fontSize: 12, color: "#1e1b20", fontWeight: "500" }}>
                        {user.whatsapp_number || "-"}
                      </Text>
                    </View>
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <Text style={{ fontSize: 12, color: "#64748b" }}>Usia / Tgl Lahir</Text>
                      <Text style={{ fontSize: 12, color: "#1e1b20" }}>
                        {userAge}{" "}
                        {user.birth_date
                          ? `(${format(new Date(user.birth_date), "dd/MM/yyyy")})`
                          : ""}
                      </Text>
                    </View>
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <Text style={{ fontSize: 12, color: "#64748b" }}>Jumlah Anak</Text>
                      <Text style={{ fontSize: 12, color: "#1e1b20" }}>
                        {user.children_count || "0"}
                      </Text>
                    </View>

                    <View style={{ height: 1, backgroundColor: "#f8fafc", marginVertical: 2 }} />

                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <Text style={{ fontSize: 12, color: "#64748b" }}>Nama Suami</Text>
                      <Text style={{ fontSize: 12, color: "#1e1b20", fontWeight: "bold" }}>
                        {user.husband_name || "-"}
                      </Text>
                    </View>
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <Text style={{ fontSize: 12, color: "#64748b" }}>No. WA Suami</Text>
                      <Text style={{ fontSize: 12, color: "#1e1b20" }}>
                        {user.husband_number || "-"}
                      </Text>
                    </View>

                    <View style={{ height: 1, backgroundColor: "#f8fafc", marginVertical: 2 }} />

                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <Text style={{ fontSize: 12, color: "#64748b" }}>HPHT (Terakhir Haid)</Text>
                      <Text style={{ fontSize: 12, color: "#ec4899", fontWeight: "bold" }}>
                        {user.last_period_date
                          ? format(new Date(user.last_period_date), "dd MMM yyyy")
                          : "-"}
                      </Text>
                    </View>
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <Text style={{ fontSize: 12, color: "#64748b" }}>Panjang Siklus / Haid</Text>
                      <Text style={{ fontSize: 12, color: "#1e1b20" }}>
                        {user.cycle_length} Hari / {user.period_length} Hari
                      </Text>
                    </View>

                    <View style={{ height: 1, backgroundColor: "#f8fafc", marginVertical: 2 }} />

                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <Text style={{ fontSize: 12, color: "#64748b" }}>Tabungan Terkumpul</Text>
                      <Text style={{ fontSize: 12, color: "#10b981", fontWeight: "bold" }}>
                        Rp {user.current_saving?.toLocaleString("id-ID") || "0"}
                      </Text>
                    </View>
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <Text style={{ fontSize: 12, color: "#64748b" }}>Target Tabungan</Text>
                      <Text style={{ fontSize: 12, color: "#64748b", fontWeight: "bold" }}>
                        Rp {user.target_saving?.toLocaleString("id-ID") || "0"}
                      </Text>
                    </View>

                    <View style={{ height: 1, backgroundColor: "#f8fafc", marginVertical: 2 }} />

                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <Text style={{ fontSize: 12, color: "#94a3b8" }}>Tanggal Registrasi</Text>
                      <Text style={{ fontSize: 12, color: "#94a3b8" }}>{registerDate}</Text>
                    </View>
                    {user.last_sign_in_at && (
                      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                        <Text style={{ fontSize: 12, color: "#94a3b8" }}>Terakhir Login</Text>
                        <Text style={{ fontSize: 12, color: "#94a3b8" }}>
                          {formatRelative(user.last_sign_in_at)}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}