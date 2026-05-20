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
import Constants from 'expo-constants';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { format, differenceInYears } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { supabase } from '../src/lib/supabase';
import { REACTION_EMOJI } from '../src/lib/communityTypes';

// Replicate old types
interface AdminUser {
  id: string;
  email: string;
  last_sign_in_at?: string;
  name?: string;
  nickname?: string;
  whatsapp_number?: string;
  birth_date?: string;
  children_count?: string;
  last_period_date: string;
  husband_name: string;
  husband_number?: string;
  cycle_length: number;
  period_length: number;
  target_saving: number;
  current_saving: number;
  created_at: string;
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

interface PostRow {
  id: string;
  user_id: string;
  content: string;
  is_anonymous: boolean;
  is_hidden: boolean;
  hidden_reason: string | null;
  report_count: number;
  admin_reviewed_at: string | null;
  admin_review_status: 'kept' | 'removed' | null;
  comment_count: number;
  reaction_count: number;
  created_at: string;
}

interface CommentRow {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  is_anonymous: boolean;
  is_hidden: boolean;
  hidden_reason: string | null;
  report_count: number;
  admin_reviewed_at: string | null;
  admin_review_status: 'kept' | 'removed' | null;
  created_at: string;
}

interface ProfileRow {
  id: string;
  name: string | null;
  nickname: string | null;
}

interface QueueItem {
  key: string;
  target_type: 'post' | 'comment';
  target_id: string;
  content: string;
  authorId: string;
  authorLabel: string;
  authorRealLabel: string;
  is_anonymous: boolean;
  is_hidden: boolean;
  reportCount: number;
  reviewStatus: 'kept' | 'removed' | null;
  reviewedAt: string | null;
  createdAt: string;
  reports: ReportRow[];
}

function formatRelative(dateStr: string) {
  try {
    return format(new Date(dateStr), 'd MMM yyyy HH:mm', { locale: localeId });
  } catch {
    return dateStr;
  }
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
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [posts, setPosts] = useState<Record<string, PostRow>>({});
  const [comments, setComments] = useState<Record<string, CommentRow>>({});
  const [profiles, setProfiles] = useState<Record<string, ProfileRow>>({});
  const [actingKey, setActingKey] = useState<string | null>(null);
  const [expandedQueueKey, setExpandedQueueKey] = useState<string | null>(null);

  const getApiBaseUrl = () => {
    const debuggerHost = Constants.expoConfig?.hostUri || '';
    const ip = debuggerHost.split(':')[0];
    if (ip) return `http://${ip}:3000`;
    return 'http://localhost:3000';
  };

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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sesi tidak ditemukan. Silakan login ulang.');

      const baseUrl = getApiBaseUrl();
      const response = await fetch(`${baseUrl}/api/admin/users`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Gagal memuat daftar pengguna.');
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
      // 1. Reports query
      let reportsQuery = supabase
        .from('community_reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (modFilter === 'pending') reportsQuery = reportsQuery.eq('status', 'pending');
      if (modFilter === 'reviewed') reportsQuery = reportsQuery.in('status', ['resolved_hide', 'resolved_keep']);

      const { data: reportRows, error: rErr } = await reportsQuery;
      if (rErr) throw rErr;
      const allReports = (reportRows || []) as ReportRow[];
      setReports(allReports);

      // 2. Collect target ids
      const postIds = Array.from(
        new Set(allReports.filter((r) => r.target_type === 'post').map((r) => r.target_id))
      );
      const commentIds = Array.from(
        new Set(allReports.filter((r) => r.target_type === 'comment').map((r) => r.target_id))
      );

      // 3. Fetch targets
      const [postRes, commentRes] = await Promise.all([
        postIds.length
          ? supabase.from('community_posts').select('*').in('id', postIds)
          : Promise.resolve({ data: [], error: null } as any),
        commentIds.length
          ? supabase.from('community_comments').select('*').in('id', commentIds)
          : Promise.resolve({ data: [], error: null } as any),
      ]);
      if (postRes.error) throw postRes.error;
      if (commentRes.error) throw commentRes.error;

      const postMap: Record<string, PostRow> = {};
      (postRes.data as PostRow[]).forEach((p) => { postMap[p.id] = p; });
      const commentMap: Record<string, CommentRow> = {};
      (commentRes.data as CommentRow[]).forEach((c) => { commentMap[c.id] = c; });
      setPosts(postMap);
      setComments(commentMap);

      // 4. Fetch author profiles
      const userIds = Array.from(
        new Set([
          ...Object.values(postMap).map((p) => p.user_id),
          ...Object.values(commentMap).map((c) => c.user_id),
        ])
      );
      if (userIds.length) {
        const { data: profileRows, error: pErr } = await supabase
          .from('profiles')
          .select('id, name, nickname')
          .in('id', userIds);
        if (pErr) throw pErr;
        const profileMap: Record<string, ProfileRow> = {};
        (profileRows as ProfileRow[]).forEach((p) => { profileMap[p.id] = p; });
        setProfiles(profileMap);
      } else {
        setProfiles({});
      }
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
    const grouped = new Map<string, ReportRow[]>();
    reports.forEach((r) => {
      const key = `${r.target_type}:${r.target_id}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(r);
    });

    const items: QueueItem[] = [];
    grouped.forEach((rs, key) => {
      const [target_type, target_id] = key.split(':') as ['post' | 'comment', string];
      const target = target_type === 'post' ? posts[target_id] : comments[target_id];
      if (!target) return;

      const profile = profiles[target.user_id];
      const realLabel = profile?.nickname?.trim() || profile?.name?.trim() || target.user_id.split('-')[0];
      const displayLabel = target.is_anonymous ? 'Anonim' : realLabel;

      items.push({
        key,
        target_type,
        target_id,
        content: target.content,
        authorId: target.user_id,
        authorLabel: displayLabel,
        authorRealLabel: realLabel,
        is_anonymous: target.is_anonymous,
        is_hidden: target.is_hidden,
        reportCount: target.report_count,
        reviewStatus: target.admin_review_status,
        reviewedAt: target.admin_reviewed_at,
        createdAt: target.created_at,
        reports: rs.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)),
      });
    });

    return items.sort((a, b) => {
      if (b.reportCount !== a.reportCount) return b.reportCount - a.reportCount;
      return +new Date(b.createdAt) - +new Date(a.createdAt);
    });
  }, [reports, posts, comments, profiles]);

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

  // CSV download function for web
  const downloadCSV = () => {
    if (users.length === 0) return;
    const headers = [
      'ID', 'Nama', 'Panggilan', 'No. WA', 'Usia', 'Jml Anak', 'Email', 'Nama Suami',
      'No. Suami', 'HPHT', 'Siklus', 'Periode', 'Target Tabungan', 'Tabungan', 'Terdaftar'
    ];
    const rows = users.map((user) => [
      user.id,
      user.name || '',
      user.nickname || '',
      user.whatsapp_number || '',
      user.birth_date ? `${differenceInYears(new Date(), new Date(user.birth_date))} thn` : '',
      user.children_count || '',
      user.email || '',
      user.husband_name || '',
      user.husband_number || '',
      user.last_period_date || '',
      user.cycle_length || 0,
      user.period_length || 0,
      user.target_saving || 0,
      user.current_saving || 0,
      user.created_at || '',
    ]);
    
    const csvContent = [headers, ...rows]
      .map((e) => e.map((item) => `"${item}"`).join(','))
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
