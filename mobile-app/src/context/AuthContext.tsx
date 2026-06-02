import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { storage } from '../lib/storage';
import { analytics } from '../lib/analytics';
import { buildAnalyticsUserProperties } from '../lib/analyticsIdentity';
import { getSupabaseClientStatus } from '../lib/supabaseAccess';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  signOut: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  signOut: async () => {},
  isLoading: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const status = getSupabaseClientStatus(supabase);
    if (!status.ready) {
      setIsLoading(false);
      return;
    }

    const client = status.client;

    client.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    analytics.setUser(user?.id ?? null, buildAnalyticsUserProperties(user)).catch((error) => {
      if (__DEV__) {
        console.warn('[Auth] Failed to update analytics user identity:', error);
      }
    });
  }, [user]);

  const signOut = async () => {
    const status = getSupabaseClientStatus(supabase);
    if (!status.ready) {
      setSession(null);
      setUser(null);
      return;
    }
    const allKeys = storage.getKeys();
    const keysToRemove = allKeys.filter(k => k.startsWith('hs_'));
    keysToRemove.forEach(k => storage.removeItem(k));
    const { error } = await status.client.auth.signOut();
    if (error) throw error;
    setSession(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ session, user, signOut, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
