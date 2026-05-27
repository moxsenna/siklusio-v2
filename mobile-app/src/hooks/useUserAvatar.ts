import { useCallback } from 'react';
import { useCycle } from '../context/CycleContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { AvatarKind } from '../lib/avatars';

/**
 * Wrapper untuk update avatar user — sync ke local state (CycleContext)
 * sekaligus persist ke kolom `profiles.avatar_url` & `avatar_kind` di Supabase.
 */
export function useUserAvatar() {
  const { user } = useAuth();
  const { avatarUrl, avatarKind, setAvatarUrl, setAvatarKind } = useCycle();

  const updateAvatar = useCallback(
    async (next: { url: string | null; kind: AvatarKind | null }) => {
      // Optimistic local update
      setAvatarUrl(next.url);
      setAvatarKind(next.kind);

      if (!supabase || !user) return;
      const { error } = await supabase
        .from('profiles')
        .update({
          avatar_url: next.url,
          avatar_kind: next.kind,
        })
        .eq('id', user.id);
      if (error) {
        // Roll back on error
        setAvatarUrl(avatarUrl);
        setAvatarKind(avatarKind);
        throw error;
      }
    },
    [user, avatarUrl, avatarKind, setAvatarUrl, setAvatarKind]
  );

  return { avatarUrl, avatarKind, updateAvatar };
}
