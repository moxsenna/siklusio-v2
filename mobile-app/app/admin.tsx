import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { format, differenceInYears } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { supabase } from '../src/lib/supabase';
import { REACTION_EMOJI } from '../src/lib/communityTypes';
import { apiGetJson } from '../src/lib/api';

// Replicate old types
interface AdminUser {
  id: string;
  email?: string;
  last_sign_in_at?: string;
  name?: string;
  nickname?: string;
  whatsapp_number?: string;
  birth_date?: string;
  children_count?: string;
  last_period_date: string;
  husband_name: string;
  husband_nickname?: string;
  husband_number?: string;
  cycle_length: number;
  period_length: number;
  target_saving: number;
  current_saving: number;
  created_at: string;
  updated_at?: string;
  is_admin?: boolean;
  avatar_url?: string | null;
  avatar_kind?: string | null;
}

interface ReportRow {
  id: string;
  target_type: 'post' | 'comment';
  target_id: string;
  reporter_id: string;
  reason: string | null;
  status: 'pending' | 'resolved_hide' | 'resolved_keep';
  created_at: string;
  resolved_at: string | null;
}

interface QueueItem {
  key: string;
  target_type: 'post' | 'comment';
  target_id: string;
  content: string;
  authorId: string;
  authorLabel: string;
  authorRealLabel: string;
  /** Avatar URL/preset penulis. Null kalau anonim atau belum set. */
  authorAvatarUrl: string | null;
  authorAvatarKind: 'preset' | 'custom' | null;
  is_anonymous: boolean;
  is_hidden: boolean;
  reportCount: number;
  reviewStatus: 'kept' | 'removed' | null;
  reviewedAt: string | null;
  createdAt: string;
  reports: ReportRow[];
}

interface AdminModerationQueueRow {
  report_id: string;
  target_type: 'post' | 'comment' | string;
  target_id: string;
  reporter_id: string;
  reason: string | null;
  report_status: string | null;
  report_created_at: string;
  resolved_at: string | null;
  content: string | null;
  author_id: string | null;
  author_label: string | null;
  author_real_label: string | null;
  author_avatar_url: string | null;
  author_avatar_kind: string | null;
  is_anonymous: boolean | null;
  is_hidden: boolean | null;
  report_count: number | null;
  review_status: string | null;
  reviewed_at: string | null;
  target_created_at: string | null;
}

function formatRelative(dateStr: string) {
  try {
    return format(new Date(dateStr), 'd MMM yyyy HH:mm', { locale: localeId });
  } catch {
    return dateStr;
  }
}

function formatCsvDateTime(dateStr?: string | null) {
  if (!dateStr) return '';
  try {
    return format(new Date(dateStr), 'yyyy-MM-dd HH:mm');
  } catch {
    return dateStr;
  }
}

function escapeCsvCell(value: unknown) {
  const text = value == null ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function toTargetType(value: string): 'post' | 'comment' {
  return value === 'comment' ? 'comment' : 'post';
}

function toReportStatus(value: string | null): ReportRow['status'] {
  if (value === 'resolved_hide' || value === 'resolved_keep') return value;
  return 'pending';
}

function toReviewStatus(value: string | null): QueueItem['reviewStatus'] {
  if (value === 'kept' || value === 'removed') return value;
  return null;
}

function toAvatarKind(value: string | null): QueueItem['authorAvatarKind'] {
  if (value === 'preset' || value === 'custom') return value;
  return null;
}

export default function AdminDashboard() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<'users' | 'moderation'>('users');
  
  // Users Panel states
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  // Moderation Panel states
  const [modFilter, setModFilter] = useState<'pending' | 'reviewed' | 'all'>('pending');
  const [modLoading, setModLoading] = useState(false);
  const [modError, setModError] = useState<string | null>(null);
  const [moderationRows, setModerationRows] = useState<AdminModerationQueueRow[]>([]);
  const [actingKey, setActingKey] = useState<string | null>(null);
  const [expandedQueueKey, setExpandedQueueKey] = useState<string | null>(null);

  // 1. Authenticate & Authorize Admin
  useEffect(() => {
    const checkAdmin = async () => {
      if (!supabase) {
        setIsAdmin(false);
        return;
      }
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setIsAdmin(false);
          return;
        }
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', session.user.id)
          .maybeSingle();

        if (error || !profile?.is_admin) {
          setIsAdmin(false);
        } else {
          setIsAdmin(true);
        }
      } catch {
        setIsAdmin(false);
      }
    };
    checkAdmin();
  }, []);

  // Redirect if unauthorized
  useEffect(() => {
    if (isAdmin === false) {
      if (Platform.OS === 'web') {
        router.replace('/');
      } else {
        Alert.alert('Akses Ditolak', 'Hanya administrator yang dapat mengakses halaman ini.', [
          { text: 'OK', onPress: () => router.replace('/') },
        ]);
      }
    }
  }, [isAdmin]);

  // 2. Fetch Users List
  const fetchUsers = async () => {
    if (!supabase) return;
    setUsersLoading(true);
    setUsersError(null);
    try {
      const data = await apiGetJson<{ users: AdminUser[] }>('/api/admin/users');
      setUsers(data.users || []);
    } catch (err: any) {
      setUsersError(err.message || 'Gagal memuat daftar pengguna.');
    } finally {
      setUsersLoading(false);
    }
  };

  // 3. Fetch Moderation Data
  const fetchModeration = useCallback(async () => {
    if (!supabase) {
      setModError('Supabase client tidak terkonfigurasi.');
      return;
    }
    setModLoading(true);
    setModError(null);
    try {
      const { data: rows, error } = await supabase.rpc('admin_get_moderation_queue', {
        p_filter: modFilter,
      });
      if (error) throw error;
      setModerationRows((rows || []) as AdminModerationQueueRow[]);
    } catch (err: any) {
      setModError(err.message || 'Gagal memuat data moderasi.');
    } finally {
      setModLoading(false);
    }
  }, [modFilter]);

  // Trigger loads on tab or filter switch
  useEffect(() => {
    if (isAdmin === true) {
      if (activeTab === 'users') {
        fetchUsers();
      } else {
        fetchModeration();
      }
    }
  }, [isAdmin, activeTab, fetchModeration]);

  // Group and sort moderation reports
  const moderationQueue: QueueItem[] = useMemo(() => {
    const grouped = new Map<string, AdminModerationQueueRow[]>();
    moderationRows.forEach((r) => {
      const targetType = toTargetType(r.target_type);
      const key = `${targetType}:${r.target_id}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(r);
    });

    const items: QueueItem[] = [];
    grouped.forEach((rs, key) => {
      const first = rs[0];
      if (!first) return;

      const [target_type, target_id] = key.split(':') as ['post' | 'comment', string];
      const authorId = first.author_id || 'unknown';
      const realLabel =
        first.author_real_label?.trim() ||
        authorId.split('-')[0] ||
        'Pengguna';
      const displayLabel =
        first.author_label?.trim() ||
        (first.is_anonymous ? 'Anonim' : realLabel);

      items.push({
        key,
        target_type,
        target_id,
        content: first.content || '',
        authorId,
        authorLabel: displayLabel,
        authorRealLabel: realLabel,
        authorAvatarUrl: first.author_avatar_url ?? null,
        authorAvatarKind: toAvatarKind(first.author_avatar_kind),
        is_anonymous: Boolean(first.is_anonymous),
        is_hidden: Boolean(first.is_hidden),
        reportCount: first.report_count ?? rs.length,
        reviewStatus: toReviewStatus(first.review_status),
        reviewedAt: first.reviewed_at,
        createdAt: first.target_created_at || first.report_created_at,
        reports: rs
          .map<ReportRow>((r) => ({
            id: r.report_id,
            target_type: toTargetType(r.target_type),
            target_id: r.target_id,
            reporter_id: r.reporter_id,
            reason: r.reason,
            status: toReportStatus(r.report_status),
            created_at: r.report_created_at,
            resolved_at: r.resolved_at,
          }))
          .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)),
      });
    });

    return items.sort((a, b) => {
      if (b.reportCount !== a.reportCount) return b.reportCount - a.reportCount;
      return +new Date(b.createdAt) - +new Date(a.createdAt);
    });
  }, [moderationRows]);

  // Moderate Action Handlers
  const handleModerateAction = async (item: QueueItem, action: 'keep' | 'remove') => {
    const client = supabase;
    if (!client) return;

    const actionText = action === 'remove' ? 'menyembunyikan' : 'mempertahankan';
    const performAction = async () => {
      setActingKey(item.key);
      setModError(null);
      try {
        const { error: rpcErr } = await client.rpc('admin_moderate_target', {
          p_target_type: item.target_type,
          p_target_id: item.target_id,
          p_action: action,
        });
        if (rpcErr) throw rpcErr;
        await fetchModeration();
      } catch (err: any) {
        setModError(err.message || 'Gagal mengeksekusi moderasi.');
      } finally {
        setActingKey(null);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Konfirmasi untuk ${actionText} postingan/komentar ini?`)) {
        performAction();
      }
    } else {
      Alert.alert(
        'Konfirmasi Moderasi',
        `Apakah Anda yakin ingin ${actionText} postingan/komentar ini?`,
        [
          { text: 'Batal', style: 'cancel' },
          { text: 'Ya, Lakukan', style: 'destructive', onPress: performAction }
        ]
      );
    }
  };

  /** Reset avatar penulis (mis. avatar tidak pantas). */
  const handleResetAvatar = async (item: QueueItem) => {
    const client = supabase;
    if (!client) return;

    const performReset = async () => {
      setActingKey(`avatar:${item.key}`);
      setModError(null);
      try {
        const { error: rpcErr } = await client.rpc('admin_reset_user_avatar', {
          p_user_id: item.authorId,
        });
        if (rpcErr) throw rpcErr;
        await fetchModeration();
        const okMsg = 'Avatar pengguna telah direset.';
        if (Platform.OS === 'web') window.alert(okMsg);
        else Alert.alert('Berhasil', okMsg);
      } catch (err: any) {
        setModError(err.message || 'Gagal mereset avatar pengguna.');
      } finally {
        setActingKey(null);
      }
    };

    const msg =
      `Reset avatar untuk pengguna "${item.authorRealLabel}"?\n\n` +
      `Avatar akan dihapus dan pengguna harus memilih ulang. Gunakan ini ` +
      `kalau avatar yang diunggah melanggar aturan komunitas.`;

    if (Platform.OS === 'web') {
      if (window.confirm(msg)) performReset();
    } else {
      Alert.alert(
        'Reset Avatar Pengguna',
        msg,
        [
          { text: 'Batal', style: 'cancel' },
          { text: 'Ya, Reset', style: 'destructive', onPress: performReset },
        ]
      );
    }
  };

  // CSV download function for web
  const downloadCSV = () => {
    if (users.length === 0) return;
    const headers = [
      'Email', 'Nama', 'Panggilan', 'No. WhatsApp', 'Terdaftar', 'Login Terakhir',
      'ID Pengguna', 'Tanggal Lahir', 'Usia', 'Jumlah Anak', 'HPHT', 'Panjang Siklus',
      'Lama Haid', 'Nama Suami', 'Panggilan Suami', 'No. WA Suami', 'Target Tabungan',
      'Tabungan Saat Ini', 'Admin', 'Avatar Kind', 'Avatar URL', 'Updated At'
    ];
    const rows = users.map((user) => [
      user.email || '',
      user.name || '',
      user.nickname || '',
      user.whatsapp_number || '',
      formatCsvDateTime(user.created_at),
      formatCsvDateTime(user.last_sign_in_at),
      user.id,
      user.birth_date || '',
      user.birth_date ? differenceInYears(new Date(), new Date(user.birth_date)) : '',
      user.children_count || '',
      user.last_period_date || '',
      user.cycle_length || 0,
      user.period_length || 0,
      user.husband_name || '',
      user.husband_nickname || '',
      user.husband_number || '',
      user.target_saving || 0,
      user.current_saving || 0,
      user.is_admin ? 'Ya' : 'Tidak',
      user.avatar_kind || '',
      user.avatar_url || '',
      formatCsvDateTime(user.updated_at),
    ]);
    
    const csvContent = [headers, ...rows]
      .map((row) => row.map(escapeCsvCell).join(','))
      .join('\n');
    
    if (Platform.OS === 'web') {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `siklusio_users_${format(new Date(), 'yyyyMMdd')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Filtered Users
  const filteredUsers = useMemo(() => {
    if (!searchTerm) return users;
    const query = searchTerm.toLowerCase();
    return users.filter(
      (u) =>
        (u.email && u.email.toLowerCase().includes(query)) ||
        (u.name && u.name.toLowerCase().includes(query)) ||
        (u.nickname && u.nickname.toLowerCase().includes(query)) ||
        (u.husband_name && u.husband_name.toLowerCase().includes(query))
    );
  }, [users, searchTerm]);

  if (isAdmin === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#ec4899" />
        <Text style={{ marginTop: 16, fontSize: 13, color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1.5 }}>
          Memverifikasi Akses Admin...
        </Text>
      </View>
    );
  }

  if (isAdmin === false) {
    return null; // will be redirected by useEffect
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#fcf8fa' }}>
      {/* Sticky Premium Header */}
      <View style={{ backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1e6eb', paddingTop: 48, paddingHorizontal: 24, paddingBottom: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#fce7f3', alignItems: 'center', justifyContent: 'center' }}>
                <FontAwesome name="shield" size={20} color="#ec4899" />
              </View>
              <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#1e1b20', fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' }}>
                Admin Portal
              </Text>
            </View>
            <Text style={{ fontSize: 10, fontWeight: 'bold', letterSpacing: 1.5, color: '#94a3b8', textTransform: 'uppercase', marginTop: 6 }}>
              {activeTab === 'users' ? 'User Management Dashboard' : 'Antrian Moderasi Komunitas'}
            </Text>
          </View>
          
          <TouchableOpacity 
            onPress={() => router.replace('/')}
            style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f1f5f9', flexDirection: 'row', alignItems: 'center', gap: 6 }}
          >
            <FontAwesome name="arrow-left" size={12} color="#64748b" />
            <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#64748b' }}>Kembali</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Controls */}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 20 }}>
          <TouchableOpacity
            onPress={() => setActiveTab('users')}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 20,
              borderRadius: 20,
              backgroundColor: activeTab === 'users' ? '#ec4899' : 'transparent',
              borderWidth: activeTab === 'users' ? 0 : 1,
              borderColor: '#f1e6eb',
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: 'bold', color: activeTab === 'users' ? '#fff' : '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>
              👥 Pengguna ({users.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('moderation')}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 20,
              borderRadius: 20,
              backgroundColor: activeTab === 'moderation' ? '#ec4899' : 'transparent',
              borderWidth: activeTab === 'moderation' ? 0 : 1,
              borderColor: '#f1e6eb',
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: 'bold', color: activeTab === 'moderation' ? '#fff' : '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>
              🚩 Moderasi ({moderationQueue.filter(q => !q.reviewedAt).length} pending)
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content Area */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        
        {/* Tab Users */}
        {activeTab === 'users' && (
          <View style={{ gap: 16 }}>
            {/* Toolbar */}
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <View style={{ flex: 1, minWidth: 200, height: 44, borderRadius: 22, backgroundColor: '#fff', borderWidth: 1, borderColor: '#f1e6eb', paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <FontAwesome name="search" size={16} color="#94a3b8" />
                <TextInput
                  placeholder="Cari email, nama, atau panggilan..."
                  value={searchTerm}
                  onChangeText={setSearchTerm}
                  style={{ flex: 1, fontSize: 13, color: '#1e1b20' }}
                />
              </View>

              <TouchableOpacity 
                onPress={fetchUsers}
                style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', borderWidth: 1, borderColor: '#f1e6eb', alignItems: 'center', justifyContent: 'center' }}
              >
                <FontAwesome name="refresh" size={16} color="#ec4899" />
              </TouchableOpacity>

              {Platform.OS === 'web' && (
                <TouchableOpacity 
                  onPress={downloadCSV}
                  disabled={users.length === 0}
                  style={{ height: 44, paddingHorizontal: 16, borderRadius: 22, backgroundColor: '#ec4899', flexDirection: 'row', alignItems: 'center', gap: 8, opacity: users.length === 0 ? 0.5 : 1 }}
                >
                  <FontAwesome name="download" size={14} color="#fff" />
                  <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#fff', textTransform: 'uppercase', letterSpacing: 1 }}>Unduh CSV</Text>
                </TouchableOpacity>
              )}
            </View>

            {usersError && (
              <View style={{ backgroundColor: '#fef2f2', borderColor: '#fee2e2', borderWidth: 1, borderRadius: 16, padding: 16, flexDirection: 'row', gap: 12 }}>
                <Text style={{ fontSize: 18 }}>⚠️</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#991b1b' }}>Gagal Mengambil Data</Text>
                  <Text style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>{usersError}</Text>
                </View>
              </View>
            )}

            {usersLoading ? (
              <View style={{ paddingVertical: 48, alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#ec4899" />
              </View>
            ) : filteredUsers.length === 0 ? (
              <View style={{ backgroundColor: '#fff', borderRadius: 24, borderWidth: 1, borderColor: '#f1e6eb', padding: 32, alignItems: 'center' }}>
                <Text style={{ fontSize: 14, color: '#94a3b8', fontWeight: 'bold' }}>Tidak ada pengguna ditemukan</Text>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                {filteredUsers.map((user) => {
                  const isExpanded = expandedUserId === user.id;
                  const registerDate = user.created_at ? format(new Date(user.created_at), 'dd MMM yyyy HH:mm') : '-';
                  const userAge = user.birth_date ? `${differenceInYears(new Date(), new Date(user.birth_date))} tahun` : '-';
                  
                  return (
                    <View 
                      key={user.id}
                      style={{ backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#f1e6eb', padding: 16, gap: 12 }}
                    >
                      {/* Card Header Summary */}
                      <TouchableOpacity 
                        onPress={() => setExpandedUserId(isExpanded ? null : user.id)}
                        style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                      >
                        <View style={{ gap: 4, flex: 1 }}>
                          <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#1e1b20' }}>
                            {user.name || user.nickname || 'Tidak Bernama'}
                          </Text>
                          <Text style={{ fontSize: 12, color: '#64748b' }}>
                            {user.email || 'Tanpa Email'}
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                          <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#ec4899', backgroundColor: '#fce7f3', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                            {user.nickname || 'User'}
                          </Text>
                          <FontAwesome name={isExpanded ? 'chevron-up' : 'chevron-down'} size={14} color="#94a3b8" />
                        </View>
                      </TouchableOpacity>

                      {/* Expandable Details */}
                      {isExpanded && (
                        <View style={{ borderTopWidth: 1, borderTopColor: '#f8fafc', paddingTop: 12, gap: 8 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ fontSize: 12, color: '#64748b' }}>ID Pengguna</Text>
                            <Text style={{ fontSize: 12, fontFamily: 'monospace', color: '#1e1b20' }}>{user.id.split('-')[0]}...</Text>
                          </View>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ fontSize: 12, color: '#64748b' }}>No. WhatsApp</Text>
                            <Text style={{ fontSize: 12, color: '#1e1b20', fontWeight: '500' }}>{user.whatsapp_number || '-'}</Text>
                          </View>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ fontSize: 12, color: '#64748b' }}>Usia / Tgl Lahir</Text>
                            <Text style={{ fontSize: 12, color: '#1e1b20' }}>{userAge} {user.birth_date ? `(${format(new Date(user.birth_date), 'dd/MM/yyyy')})` : ''}</Text>
                          </View>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ fontSize: 12, color: '#64748b' }}>Jumlah Anak</Text>
                            <Text style={{ fontSize: 12, color: '#1e1b20' }}>{user.children_count || '0'}</Text>
                          </View>
                          
                          <View style={{ height: 1, backgroundColor: '#f8fafc', marginVertical: 2 }} />

                          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ fontSize: 12, color: '#64748b' }}>Nama Suami</Text>
                            <Text style={{ fontSize: 12, color: '#1e1b20', fontWeight: 'bold' }}>{user.husband_name || '-'}</Text>
                          </View>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ fontSize: 12, color: '#64748b' }}>No. WA Suami</Text>
                            <Text style={{ fontSize: 12, color: '#1e1b20' }}>{user.husband_number || '-'}</Text>
                          </View>

                          <View style={{ height: 1, backgroundColor: '#f8fafc', marginVertical: 2 }} />

                          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ fontSize: 12, color: '#64748b' }}>HPHT (Terakhir Haid)</Text>
                            <Text style={{ fontSize: 12, color: '#ec4899', fontWeight: 'bold' }}>{user.last_period_date ? format(new Date(user.last_period_date), 'dd MMM yyyy') : '-'}</Text>
                          </View>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ fontSize: 12, color: '#64748b' }}>Panjang Siklus / Haid</Text>
                            <Text style={{ fontSize: 12, color: '#1e1b20' }}>{user.cycle_length} Hari / {user.period_length} Hari</Text>
                          </View>
                          
                          <View style={{ height: 1, backgroundColor: '#f8fafc', marginVertical: 2 }} />

                          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ fontSize: 12, color: '#64748b' }}>Tabungan Terkumpul</Text>
                            <Text style={{ fontSize: 12, color: '#10b981', fontWeight: 'bold' }}>Rp {user.current_saving?.toLocaleString('id-ID') || '0'}</Text>
                          </View>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ fontSize: 12, color: '#64748b' }}>Target Tabungan</Text>
                            <Text style={{ fontSize: 12, color: '#64748b', fontWeight: 'bold' }}>Rp {user.target_saving?.toLocaleString('id-ID') || '0'}</Text>
                          </View>

                          <View style={{ height: 1, backgroundColor: '#f8fafc', marginVertical: 2 }} />

                          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ fontSize: 12, color: '#94a3b8' }}>Tanggal Registrasi</Text>
                            <Text style={{ fontSize: 12, color: '#94a3b8' }}>{registerDate}</Text>
                          </View>
                          {user.last_sign_in_at && (
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                              <Text style={{ fontSize: 12, color: '#94a3b8' }}>Terakhir Login</Text>
                              <Text style={{ fontSize: 12, color: '#94a3b8' }}>{formatRelative(user.last_sign_in_at)}</Text>
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
        )}

        {/* Tab Moderation */}
        {activeTab === 'moderation' && (
          <View style={{ gap: 16 }}>
            {/* Toolbar Filter */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <View style={{ flexDirection: 'row', gap: 4, backgroundColor: '#fff', borderWidth: 1, borderColor: '#f1e6eb', borderRadius: 20, padding: 4, flex: 1, minWidth: 260 }}>
                {(['pending', 'reviewed', 'all'] as const).map((f) => {
                  const isSel = modFilter === f;
                  const lbl = f === 'pending' ? 'Menunggu' : f === 'reviewed' ? 'Direview' : 'Semua';
                  return (
                    <TouchableOpacity
                       key={f}
                       onPress={() => setModFilter(f)}
                       style={{ flex: 1, paddingVertical: 6, borderRadius: 16, backgroundColor: isSel ? '#ec4899' : 'transparent', alignItems: 'center' }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: 'bold', color: isSel ? '#fff' : '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        {lbl}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ fontSize: 11, color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>
                  {moderationQueue.length} Item
                </Text>
                <TouchableOpacity 
                  onPress={fetchModeration}
                  style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#f1e6eb', alignItems: 'center', justifyContent: 'center' }}
                >
                  <FontAwesome name="refresh" size={14} color="#ec4899" />
                </TouchableOpacity>
              </View>
            </View>

            {modError && (
              <View style={{ backgroundColor: '#fef2f2', borderColor: '#fee2e2', borderWidth: 1, borderRadius: 16, padding: 16, flexDirection: 'row', gap: 12 }}>
                <Text style={{ fontSize: 18 }}>⚠️</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#991b1b' }}>Gagal Mengambil Laporan</Text>
                  <Text style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>{modError}</Text>
                </View>
              </View>
            )}

            {modLoading ? (
              <View style={{ paddingVertical: 48, alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#ec4899" />
              </View>
            ) : moderationQueue.length === 0 ? (
              <View style={{ backgroundColor: '#fff', borderRadius: 24, borderWidth: 1, borderColor: '#f1e6eb', padding: 32, alignItems: 'center', gap: 12 }}>
                <Text style={{ fontSize: 32 }}>🚩</Text>
                <Text style={{ fontSize: 14, color: '#94a3b8', fontWeight: 'bold', textAlign: 'center' }}>
                  {modFilter === 'pending' ? 'Tidak ada laporan yang menunggu moderasi!' : 'Antrian kosong.'}
                </Text>
              </View>
            ) : (
              <View style={{ gap: 16 }}>
                {moderationQueue.map((item) => {
                  const isActing = actingKey === item.key;
                  const isExpandedReports = expandedQueueKey === item.key;
                  
                  return (
                    <View 
                      key={item.key}
                      style={{ backgroundColor: '#fff', borderRadius: 24, borderWidth: 1, borderColor: '#f1e6eb', shadowColor: '#000', shadowOffset: { width:0, height:2 }, shadowOpacity:0.02, shadowRadius:8, overflow: 'hidden' }}
                    >
                      {/* Top metadata row */}
                      <View style={{ backgroundColor: '#faf5f8', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1e6eb', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                        <Text style={{ fontSize: 10, fontWeight: 'bold', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, color: item.target_type === 'post' ? '#ec4899' : '#3b82f6', backgroundColor: item.target_type === 'post' ? '#fce7f3' : '#dbeafe', textTransform: 'uppercase' }}>
                          {item.target_type === 'post' ? 'Postingan' : 'Komentar'}
                        </Text>

                        <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#dc2626' }}>
                          🚩 {item.reportCount} Laporan
                        </Text>

                        <Text style={{ fontSize: 10, fontWeight: 'bold', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, color: item.is_hidden ? '#d97706' : '#15803d', backgroundColor: item.is_hidden ? '#fef3c7' : '#dcfce7', textTransform: 'uppercase' }}>
                          {item.is_hidden ? '🚫 Tersembunyi' : '👁️ Tampil'}
                        </Text>

                        <Text style={{ fontSize: 10, color: '#94a3b8', marginLeft: 'auto' }}>
                          {formatRelative(item.createdAt)}
                        </Text>
                      </View>

                      {/* Content block */}
                      <View style={{ padding: 16, gap: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#1e1b20' }}>
                            {item.authorLabel}
                          </Text>
                          {item.is_anonymous && (
                            <Text style={{ fontSize: 10, color: '#64748b', fontStyle: 'italic' }}>
                              (Asli: {item.authorRealLabel})
                            </Text>
                          )}
                          <Text style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace' }}>
                            · {item.authorId.split('-')[0]}
                          </Text>
                        </View>

                        <Text style={{ fontSize: 13, color: '#334155', lineHeight: 18 }}>
                          {item.content}
                        </Text>
                      </View>

                      {/* Collapsible Reports list */}
                      <View style={{ borderTopWidth: 1, borderTopColor: '#f8fafc' }}>
                        <TouchableOpacity
                          onPress={() => setExpandedQueueKey(isExpandedReports ? null : item.key)}
                          style={{ paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                        >
                          <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            💬 Alasan Laporan ({item.reports.length})
                          </Text>
                          <FontAwesome name={isExpandedReports ? 'chevron-up' : 'chevron-down'} size={12} color="#94a3b8" />
                        </TouchableOpacity>

                        {isExpandedReports && (
                          <View style={{ paddingHorizontal: 16, paddingBottom: 12, gap: 6 }}>
                            {item.reports.map((rep) => (
                              <View 
                                key={rep.id} 
                                style={{ backgroundColor: '#f8fafc', padding: 10, borderRadius: 12, gap: 4 }}
                              >
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                  <Text style={{ fontSize: 10, color: '#64748b' }}>
                                    Pelapor: {rep.reporter_id.split('-')[0]}
                                  </Text>
                                  <Text style={{ fontSize: 10, color: '#94a3b8' }}>
                                    {formatRelative(rep.created_at)}
                                  </Text>
                                </View>
                                <Text style={{ fontSize: 12, color: '#1e1b20', fontWeight: '500' }}>
                                  Alasan: {rep.reason || 'Tidak diisi'}
                                </Text>
                                <Text style={{ fontSize: 9, fontWeight: 'bold', color: rep.status === 'pending' ? '#d97706' : rep.status === 'resolved_hide' ? '#dc2626' : '#15803d', textTransform: 'uppercase' }}>
                                  Status: {rep.status === 'pending' ? 'menunggu' : rep.status === 'resolved_hide' ? 'dihapus' : 'dipertahankan'}
                                </Text>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>

                      {/* Action buttons footer */}
                      <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#f1e6eb', padding: 8, gap: 8, backgroundColor: '#fcf8fa' }}>
                        <TouchableOpacity
                          disabled={isActing}
                          onPress={() => handleModerateAction(item, 'keep')}
                          style={{ flex: 1, height: 40, borderRadius: 12, backgroundColor: '#dcfce7', borderWidth: 1, borderColor: '#bbf7d0', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}
                        >
                          <FontAwesome name="check" size={14} color="#15803d" />
                          <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#15803d', textTransform: 'uppercase', letterSpacing: 0.5 }}>Pertahankan</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          disabled={isActing}
                          onPress={() => handleModerateAction(item, 'remove')}
                          style={{ flex: 1, height: 40, borderRadius: 12, backgroundColor: '#fee2e2', borderWidth: 1, borderColor: '#fecaca', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}
                        >
                          <FontAwesome name="times" size={14} color="#b91c1c" />
                          <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#b91c1c', textTransform: 'uppercase', letterSpacing: 0.5 }}>Sembunyikan</Text>
                        </TouchableOpacity>
                      </View>

                      {/* Avatar moderation: muncul hanya kalau penulis punya avatar custom */}
                      {!item.is_anonymous && item.authorAvatarKind === 'custom' && (
                        <TouchableOpacity
                          disabled={actingKey === `avatar:${item.key}`}
                          onPress={() => handleResetAvatar(item)}
                          style={{
                            marginTop: 8,
                            height: 36,
                            borderRadius: 12,
                            backgroundColor: '#fffbeb',
                            borderWidth: 1,
                            borderColor: '#fef3c7',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexDirection: 'row',
                            gap: 6,
                          }}
                        >
                          {actingKey === `avatar:${item.key}` ? (
                            <ActivityIndicator size="small" color="#b45309" />
                          ) : (
                            <FontAwesome name="image" size={12} color="#b45309" />
                          )}
                          <Text
                            style={{
                              fontSize: 10,
                              fontWeight: 'bold',
                              color: '#b45309',
                              textTransform: 'uppercase',
                              letterSpacing: 0.5,
                            }}
                          >
                            Reset Avatar Pengguna
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
