import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, Modal, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useCycle } from '../../src/context/CycleContext';
import { useAuth } from '../../src/context/AuthContext';
import { resolveAvatarSource } from '../../src/lib/avatars';
import { supabase } from '../../src/lib/supabase';
import { useTheme } from '../../src/context/ThemeContext';

export function HeaderProfileButton() {
  const router = useRouter();
  const { avatarUrl, avatarKind, userNickname } = useCycle();
  const { signOut, session } = useAuth();
  const { themeMode, setThemeMode } = useTheme();
  const [menuVisible, setMenuVisible] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const avatarSource = useMemo(() => resolveAvatarSource(avatarUrl, avatarKind), [avatarUrl, avatarKind]);

  // Check admin status dynamically only when the profile menu sheet is opened
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!supabase || !session?.user?.id) {
        setIsAdmin(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', session.user.id)
          .single();
        if (data && !error) {
          setIsAdmin(!!data.is_admin);
        } else {
          setIsAdmin(false);
        }
      } catch (e) {
        console.warn("Gagal mengecek status admin:", e);
        setIsAdmin(false);
      }
    };

    if (menuVisible) {
      checkAdminStatus();
    }
  }, [menuVisible, session]);

  const handleNavigate = (path: string) => {
    setMenuVisible(false);
    // Give modal time to close on Android before navigating
    setTimeout(() => {
      router.push(path as any);
    }, 100);
  };

  const handleLogout = async () => {
    setMenuVisible(false);
    try {
      await signOut();
      router.replace('/auth');
    } catch (e) {
      console.warn("Gagal melakukan logout:", e);
    }
  };

  return (
    <>
      <TouchableOpacity
        onPress={() => setMenuVisible(true)}
        accessibilityLabel="Menu Profil"
        className="w-12 h-12 bg-primary/10 rounded-2xl items-center justify-center border-2 border-primary/30 overflow-hidden active:scale-95 shadow-sm"
      >
        {avatarSource ? (
          <Image source={avatarSource} className="w-full h-full" resizeMode="cover" />
        ) : (
          <Text className="text-primary font-bold text-lg">
            {userNickname ? userNickname.charAt(0).toUpperCase() : 'U'}
          </Text>
        )}
      </TouchableOpacity>

      <Modal
        visible={menuVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setMenuVisible(false)}
      >
        <View className="flex-1 justify-end">
          {/* Backdrop */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setMenuVisible(false)}
            className="absolute inset-0 bg-black/50"
          />

          {/* Bottom Sheet Container */}
          <View className="relative bg-[#f8f5ff] dark:bg-[#120917] rounded-t-[32px] w-full max-w-md mx-auto p-[24px] pb-[40px] border-t border-purple-100 dark:border-[#ec4899]/10 shadow-xl z-50">
            {/* Header info */}
            <View className="flex-row items-center gap-4 mb-6 border-b border-purple-200/50 dark:border-[#ec4899]/10 pb-5">
              <View className="w-16 h-16 rounded-[20px] bg-pink-100 dark:bg-purple-950/40 items-center justify-center border border-pink-200 dark:border-[#ec4899]/20 overflow-hidden shrink-0">
                {avatarSource ? (
                  <Image source={avatarSource} className="w-full h-full" resizeMode="cover" />
                ) : (
                  <Text className="text-primary font-extrabold text-2xl">
                    {userNickname ? userNickname.charAt(0).toUpperCase() : 'U'}
                  </Text>
                )}
              </View>
              <View className="flex-1">
                <Text className="text-[10px] text-purple-600 dark:text-[#ec4899] font-extrabold uppercase tracking-widest mb-0.5">
                  Anggota Siklusio
                </Text>
                <Text className="text-lg font-bold text-gray-800 dark:text-[#fdf2f8] leading-tight">
                  {userNickname || 'Pengguna'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setMenuVisible(false)}
                className="w-8 h-8 rounded-full bg-purple-100/60 dark:bg-purple-950/60 items-center justify-center active:scale-90"
              >
                <Text className="text-sm font-bold text-purple-800 dark:text-purple-300">✕</Text>
              </TouchableOpacity>
            </View>

             {/* Menu Items */}
            <View className="gap-3">
              {/* Edit Profile Option */}
              <TouchableOpacity
                onPress={() => handleNavigate('/settings?tab=profile')}
                className="flex-row items-center gap-4 p-4 rounded-2xl bg-white dark:bg-[#251830] border border-purple-100 dark:border-[#ec4899]/10 shadow-sm active:scale-[0.98]"
              >
                <View className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-[#1a0f24] items-center justify-center">
                  <FontAwesome name="user" size={18} color="#9333ea" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-bold text-gray-800 dark:text-[#fdf2f8]">Edit Profil & Pasangan</Text>
                  <Text className="text-[10px] text-gray-400 dark:text-purple-300/60 mt-0.5">Ubah nama panggilan & WhatsApp suami</Text>
                </View>
                <FontAwesome name="angle-right" size={16} color="#c084fc" />
              </TouchableOpacity>

              {/* Cycle & Savings Settings Option */}
              <TouchableOpacity
                onPress={() => handleNavigate('/settings?tab=cycle')}
                className="flex-row items-center gap-4 p-4 rounded-2xl bg-white dark:bg-[#251830] border border-purple-100 dark:border-[#ec4899]/10 shadow-sm active:scale-[0.98]"
              >
                <View className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-[#1a0f24] items-center justify-center">
                  <FontAwesome name="cog" size={18} color="#9333ea" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-bold text-gray-800 dark:text-[#fdf2f8]">Pengaturan Siklus & Celengan</Text>
                  <Text className="text-[10px] text-gray-400 dark:text-purple-300/60 mt-0.5">Ubah HPHT, panjang haid, & target tabungan</Text>
                </View>
                <FontAwesome name="angle-right" size={16} color="#c084fc" />
              </TouchableOpacity>

              {/* Affiliate Program Option */}
              <TouchableOpacity
                onPress={() => handleNavigate('/affiliate')}
                className="flex-row items-center gap-4 p-4 rounded-2xl bg-white dark:bg-[#251830] border border-purple-100 dark:border-[#ec4899]/10 shadow-sm active:scale-[0.98]"
              >
                <View className="w-10 h-10 rounded-xl bg-pink-50 dark:bg-[#1a0f24] items-center justify-center">
                  <FontAwesome name="gift" size={18} color="#db2777" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-bold text-gray-800 dark:text-[#fdf2f8]">Program Afiliasi 🌸</Text>
                  <Text className="text-[10px] text-gray-400 dark:text-purple-300/60 mt-0.5">Dapatkan komisi untuk setiap bunda yang bergabung</Text>
                </View>
                <FontAwesome name="angle-right" size={16} color="#c084fc" />
              </TouchableOpacity>

              {/* Admin Panel Option (Visible only to authentic admins) */}
              {isAdmin && (
                <TouchableOpacity
                  onPress={() => handleNavigate('/admin')}
                  className="flex-row items-center gap-4 p-4 rounded-2xl bg-white dark:bg-[#251830] border border-purple-100 dark:border-[#ec4899]/10 shadow-sm active:scale-[0.98]"
                >
                  <View className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-[#1a0f24] items-center justify-center">
                    <FontAwesome name="shield" size={18} color="#9333ea" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-gray-800 dark:text-[#fdf2f8]">Panel Admin Moderasi</Text>
                    <Text className="text-[10px] text-gray-400 dark:text-purple-300/60 mt-0.5">Kelola kupon & verifikasi konten</Text>
                  </View>
                  <FontAwesome name="angle-right" size={16} color="#c084fc" />
                </TouchableOpacity>
              )}

              {/* Night Sanctuary (Mode Gelap) Toggle Box */}
              <View className="p-4 rounded-2xl bg-white dark:bg-[#251830] border border-purple-100 dark:border-[#ec4899]/20 shadow-sm">
                <View className="flex-row items-center gap-3 mb-3">
                  <View className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-[#1a0f24] items-center justify-center">
                    <FontAwesome name="moon-o" size={16} color="#ec4899" />
                  </View>
                  <View>
                    <Text className="text-xs font-bold text-gray-800 dark:text-[#fdf2f8]">Night Sanctuary (Pola Layar)</Text>
                    <Text className="text-[9px] text-gray-400 dark:text-purple-300/60 font-medium">Ubah suasana kenikmatan tidur Bunda</Text>
                  </View>
                </View>

                <View className="flex-row gap-2">
                  <TouchableOpacity
                    onPress={() => setThemeMode('light')}
                    className={`flex-1 py-2 px-1 rounded-xl items-center border border-solid justify-center flex-row gap-1 active:scale-95 ${
                      themeMode === 'light'
                        ? 'bg-primary/10 border-primary dark:bg-primary/20 dark:border-primary'
                        : 'bg-gray-50 border-gray-200 dark:bg-[#1a0f24] dark:border-[#ec4899]/10'
                    }`}
                  >
                    <Text className="text-xs">☀️</Text>
                    <Text className={`text-[10px] font-bold ${
                      themeMode === 'light' ? 'text-primary' : 'text-gray-500 dark:text-purple-300'
                    }`}>Terang</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setThemeMode('dark')}
                    className={`flex-1 py-2 px-1 rounded-xl items-center border border-solid justify-center flex-row gap-1 active:scale-95 ${
                      themeMode === 'dark'
                        ? 'bg-primary/10 border-primary dark:bg-primary/20 dark:border-primary'
                        : 'bg-gray-50 border-gray-200 dark:bg-[#1a0f24] dark:border-[#ec4899]/10'
                    }`}
                  >
                    <Text className="text-xs">🌙</Text>
                    <Text className={`text-[10px] font-bold ${
                      themeMode === 'dark' ? 'text-primary' : 'text-gray-500 dark:text-purple-300'
                    }`}>Gelap</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setThemeMode('system')}
                    className={`flex-1 py-2 px-1 rounded-xl items-center border border-solid justify-center flex-row gap-1 active:scale-95 ${
                      themeMode === 'system'
                        ? 'bg-primary/10 border-primary dark:bg-primary/20 dark:border-primary'
                        : 'bg-gray-50 border-gray-200 dark:bg-[#1a0f24] dark:border-[#ec4899]/10'
                    }`}
                  >
                    <FontAwesome name="mobile" size={12} color={themeMode === 'system' ? '#ec4899' : '#a21caf'} />
                    <Text className={`text-[10px] font-bold ${
                      themeMode === 'system' ? 'text-primary' : 'text-gray-500 dark:text-purple-300'
                    }`}>Sistem</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Logout Option */}
              <TouchableOpacity
                onPress={handleLogout}
                className="flex-row items-center gap-4 p-4 rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 shadow-sm active:scale-[0.98] mt-1"
              >
                <View className="w-10 h-10 rounded-xl bg-red-100/50 dark:bg-red-950/50 items-center justify-center">
                  <FontAwesome name="sign-out" size={18} color="#ef4444" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-bold text-red-700 dark:text-red-300">Keluar dari Akun</Text>
                  <Text className="text-[10px] text-red-400 dark:text-red-400/60 mt-0.5">Sesi Anda akan segera diakhiri</Text>
                </View>
                <FontAwesome name="angle-right" size={16} color="#fca5a5" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
