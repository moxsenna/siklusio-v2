import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, SafeAreaView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../src/lib/supabase';
import { useAuth } from '../src/context/AuthContext';
import { storage } from '../src/lib/storage';
import FontAwesome from '@expo/vector-icons/FontAwesome';

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const { session } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (session) {
      router.replace('/');
    }
  }, [session]);

  const handleAuth = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);

    if (!supabase) {
      setError("Supabase belum terkonfigurasi.");
      setLoading(false);
      return;
    }

    try {
      if (isLogin) {
        const { error: loginErr } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (loginErr) throw loginErr;
        router.replace('/');
      } else {
        const { data: authData, error: signupErr } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name,
              whatsapp,
            },
          },
        });
        if (signupErr) throw signupErr;

        if (authData?.user) {
          await supabase.from('profiles').update({
            name,
            whatsapp_number: whatsapp,
          }).eq('id', authData.user.id);

          storage.removeItem('hs_onboardingCompleted');
        }

        setMessage('Registrasi berhasil! Silakan periksa email Anda.');
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan sistem');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={{
        flex: 1,
        width: '100%',
        backgroundColor: '#fdf2f8',
        minHeight: Platform.OS === 'web' ? ('100%' as any) : undefined,
      }}
    >
      <ScrollView
        style={{ flex: 1, width: '100%' }}
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          alignItems: 'center',
        padding: 24,
        backgroundColor: '#fdf2f8',
      }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View
        style={{
          width: '100%',
          maxWidth: 448,
          backgroundColor: '#ffffff',
          borderRadius: 32,
          padding: 32,
          borderWidth: 1,
          borderColor: '#fbcfe8',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 2,
          elevation: 1,
        }}
      >
          {/* Logo & Header */}
          <View className="items-center mb-8">
            <View className="w-16 h-16 bg-secondary rounded-2xl items-center justify-center mb-4 shadow-sm">
              <Text className="text-3xl">💖</Text>
            </View>
            <Text className="text-2xl font-bold text-center text-on-background">
              {isLogin ? 'Selamat Datang' : 'Buat Akun Baru'}
            </Text>
            <Text className="text-sm opacity-60 mt-2 text-center text-on-background">
              {isLogin ? 'Masuk untuk mencatat perjalanan promil Anda' : 'Bergabunglah bersama kami'}
            </Text>
          </View>

          {/* Alert Error */}
          {error && (
            <View className="bg-red-50 p-4 rounded-2xl mb-6 border border-red-200">
              <Text className="text-red-700 text-sm">{error}</Text>
            </View>
          )}

          {/* Alert Message */}
          {message && (
            <View className="bg-green-50 p-4 rounded-2xl mb-6 border border-green-200">
              <Text className="text-green-700 text-sm">{message}</Text>
            </View>
          )}

          {/* Form */}
          <View className="space-y-4">
            {!isLogin && (
              <>
                <View>
                  <Text className="text-xs uppercase tracking-widest opacity-60 mb-2 font-bold text-on-background">Nama Lengkap</Text>
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="Nama Lengkap"
                    placeholderTextColor="#ec489980"
                    className="w-full px-4 py-3 rounded-2xl bg-surface-variant border border-outline-variant text-on-background"
                  />
                </View>
                <View className="mt-4">
                  <Text className="text-xs uppercase tracking-widest opacity-60 mb-2 font-bold text-on-background">No. WhatsApp</Text>
                  <TextInput
                    value={whatsapp}
                    onChangeText={setWhatsapp}
                    placeholder="0812..."
                    keyboardType="phone-pad"
                    placeholderTextColor="#ec489980"
                    className="w-full px-4 py-3 rounded-2xl bg-surface-variant border border-outline-variant text-on-background"
                  />
                </View>
              </>
            )}

            <View className="mt-4">
              <Text className="text-xs uppercase tracking-widest opacity-60 mb-2 font-bold text-on-background">Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="nama@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="#ec489980"
                className="w-full px-4 py-3 rounded-2xl bg-surface-variant border border-outline-variant text-on-background"
              />
            </View>

            <View className="mt-4">
              <Text className="text-xs uppercase tracking-widest opacity-60 mb-2 font-bold text-on-background">Password</Text>
              <View className="relative justify-center">
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  placeholderTextColor="#ec489980"
                  className="w-full pl-4 pr-12 py-3 rounded-2xl bg-surface-variant border border-outline-variant text-on-background"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  className="absolute right-4 p-1"
                >
                  <FontAwesome name={showPassword ? "eye" : "eye-slash"} size={16} color="#ec4899" />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleAuth}
              disabled={loading}
              className="w-full py-4 bg-primary rounded-2xl items-center justify-center shadow-md active:scale-95 disabled:opacity-50 mt-6"
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-on-primary font-bold uppercase tracking-widest text-sm">
                  {isLogin ? 'Masuk' : 'Daftar'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Toggle Button */}
          <View className="mt-8 items-center">
            <Text className="text-sm text-on-surface-variant opacity-80">
              {isLogin ? "Belum punya akun? " : "Sudah punya akun? "}
              <Text
                onPress={() => setIsLogin(!isLogin)}
                className="text-primary font-bold underline"
              >
                {isLogin ? 'Daftar Sekarang' : 'Masuk Disini'}
              </Text>
            </Text>
          </View>
      </View>
    </ScrollView>
    </SafeAreaView>
  );
}
