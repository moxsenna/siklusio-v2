import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, Modal, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useCycle } from '../../src/context/CycleContext';
import { useAuth } from '../../src/context/AuthContext';
import { resolveAvatarSource } from '../../src/lib/avatars';
import { supabase } from '../../src/lib/supabase';

export function HeaderProfileButton() {
  const router = useRouter();
  const { avatarUrl, avatarKind, userNickname } = useCycle();
  const { signOut, session } = useAuth();
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
          <View className="relative bg-[#f8f5ff] rounded-t-[32px] w-full max-w-md mx-auto p-[24px] pb-[40px] border-t border-purple-100 shadow-xl z-50">
            {/* Header info */}
            <View className="flex-row items-center gap-4 mb-6 border-b border-purple-200/50 pb-5">
              <View className="w-16 h-16 rounded-[20px] bg-pink-100 items-center justify-center border border-pink-200 overflow-hidden shrink-0">
                {avatarSource ? (
                  <Image source={avatarSource} className="w-full h-full" resizeMode="cover" />
                ) : (
                  <Text className="text-primary font-extrabold text-2xl">
                    {userNickname ? userNickname.charAt(0).toUpperCase() : 'U'}
                  </Text>
                )}
              </View>
              <View className="flex-1">
                <Text className="text-[10px] text-purple-600 font-extrabold uppercase tracking-widest mb-0.5">
                  Anggota Siklusio
                </Text>
                <Text className="text-lg font-bold text-gray-800 leading-tight">
                  {userNickname || 'Pengguna'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setMenuVisible(false)}
                className="w-8 h-8 rounded-full bg-purple-100/60 items-center justify-center active:scale-90"
              >
                <Text className="text-sm font-bold text-purple-800">✕</Text>
              </TouchableOpacity>
            </View>

             {/* Menu Items */}
            <View className="gap-3">
              {/* Edit Profile Option */}
              <TouchableOpacity
                onPress={() => handleNavigate('/settings?tab=profile')}
                className="flex-row items-center gap-4 p-4 rounded-2xl bg-white border border-purple-100 shadow-sm active:scale-[0.98]"
              >
                <View className="w-10 h-10 rounded-xl bg-purple-50 items-center justify-center">
                  <FontAwesome name="user" size={18} color="#9333ea" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-bold text-gray-800">Edit Profil & Pasangan</Text>
                  <Text className="text-[10px] text-gray-400 mt-0.5">Ubah nama panggilan & WhatsApp suami</Text>
                </View>
                <FontAwesome name="angle-right" size={16} color="#c084fc" />
              </TouchableOpacity>

              {/* Cycle & Savings Settings Option */}
              <TouchableOpacity
                onPress={() => handleNavigate('/settings?tab=cycle')}
                className="flex-row items-center gap-4 p-4 rounded-2xl bg-white border border-purple-100 shadow-sm active:scale-[0.98]"
              >
                <View className="w-10 h-10 rounded-xl bg-purple-50 items-center justify-center">
                  <FontAwesome name="cog" size={18} color="#9333ea" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-bold text-gray-800">Pengaturan Siklus & Celengan</Text>
                  <Text className="text-[10px] text-gray-400 mt-0.5">Ubah HPHT, panjang haid, & target tabungan</Text>
                </View>
                <FontAwesome name="angle-right" size={16} color="#c084fc" />
              </TouchableOpacity>

              {/* Affiliate Program Option */}
              <TouchableOpacity
                onPress={() => handleNavigate('/affiliate')}
                className="flex-row items-center gap-4 p-4 rounded-2xl bg-white border border-purple-100 shadow-sm active:scale-[0.98]"
              >
                <View className="w-10 h-10 rounded-xl bg-pink-50 items-center justify-center">
                  <FontAwesome name="gift" size={18} color="#db2777" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-bold text-gray-800">Program Afiliasi 🌸</Text>
                  <Text className="text-[10px] text-gray-400 mt-0.5">Dapatkan komisi untuk setiap bunda yang bergabung</Text>
                </View>
                <FontAwesome name="angle-right" size={16} color="#c084fc" />
              </TouchableOpacity>

              {/* Admin Panel Option (Visible only to authentic admins) */}
              {isAdmin && (
                <TouchableOpacity
                  onPress={() => handleNavigate('/admin')}
                  className="flex-row items-center gap-4 p-4 rounded-2xl bg-white border border-purple-100 shadow-sm active:scale-[0.98]"
                >
                  <View className="w-10 h-10 rounded-xl bg-purple-50 items-center justify-center">
                    <FontAwesome name="shield" size={18} color="#9333ea" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-gray-800">Panel Admin Moderasi</Text>
                    <Text className="text-[10px] text-gray-400 mt-0.5">Kelola kupon & verifikasi konten</Text>
                  </View>
                  <FontAwesome name="angle-right" size={16} color="#c084fc" />
                </TouchableOpacity>
              )}

              {/* Logout Option */}
              <TouchableOpacity
                onPress={handleLogout}
                className="flex-row items-center gap-4 p-4 rounded-2xl bg-red-50 border border-red-100 shadow-sm active:scale-[0.98] mt-2"
              >
                <View className="w-10 h-10 rounded-xl bg-red-100/50 items-center justify-center">
                  <FontAwesome name="sign-out" size={18} color="#ef4444" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-bold text-red-700">Keluar dari Akun</Text>
                  <Text className="text-[10px] text-red-400 mt-0.5">Sesi Anda akan segera diakhiri</Text>
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
