import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from './supabase';
import type { Session, User } from '@supabase/supabase-js';

export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  points: number;
  percentage?: number;
  is_active: boolean;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, display_name, points, is_active, percentage')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Failed to fetch profile:', error.message);
      return;
    }

    setProfile(data as Profile);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  }, [user?.id, fetchProfile]);

  useEffect(() => {
    // loadingResolved ensures we only call setLoading(false) once (on first auth event).
    // Subsequent events (TOKEN_REFRESHED, etc.) still update session/profile but don't
    // re-trigger the initial loading gate.
    let loadingResolved = false;
    const resolveLoading = () => {
      if (!loadingResolved) {
        loadingResolved = true;
        setLoading(false);
      }
    };

    // Fallback: never get stuck on LOADING screen forever
    const timer = setTimeout(resolveLoading, 3000);

    // onAuthStateChange fires INITIAL_SESSION on registration (Supabase v2),
    // so getSession() is not needed and would race with this callback.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, s) => {
        setSession(s);
        setUser(s?.user ?? null);
        if (s?.user) {
          // Don't await — fetchProfile is a network call that shouldn't block
          // the auth lock. Resolving loading immediately prevents the frozen screen.
          fetchProfile(s.user.id);
        } else {
          setProfile(null);
        }
        resolveLoading();
      }
    );

    return () => {
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  // Realtime subscription to profile changes (points updates)
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('profile-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new.is_active === false) {
            supabase.auth.signOut();
            return;
          }
          setProfile((prev) =>
            prev ? { ...prev, ...payload.new } as Profile : null
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error, data } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };

    if (data.user) {
      const { data: prof } = await supabase
        .from('profiles')
        .select('is_active')
        .eq('id', data.user.id)
        .single();

      if (prof && !prof.is_active) {
        await supabase.auth.signOut();
        return { error: 'Your account has been deactivated. Please contact support.' };
      }
    }

    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (_) {
      // ignore network errors — clear local state regardless
    } finally {
      setSession(null);
      setUser(null);
      setProfile(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
