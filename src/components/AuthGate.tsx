'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/store/useAuth';
import { useMe } from '@/hooks/api';

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const token = useAuth((s) => s.token);
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const setUser = useAuth((s) => s.setUser);
  const storeHydrated = useAuth((s) => s._storeHydrated);

  // Fetch user info if we have a token but no user object
  const { data: me, error: meError } = useMe(!!token && !user && storeHydrated);

  useEffect(() => {
    if (me) setUser(me);
  }, [me, setUser]);

  useEffect(() => {
    if (meError && (meError as { status?: number }).status === 401) {
      logout();
    }
  }, [meError, logout]);

  useEffect(() => {
    if (!storeHydrated) return; // Don't act until Zustand rehydration is complete
    if (!token && pathname !== '/login') router.replace('/login');
    if (token && pathname === '/login') router.replace('/dashboard');
  }, [storeHydrated, token, pathname, router]);

  // Block render until we know the real auth state (prevents flash + redirect loop)
  if (!storeHydrated) return null;
  if (!token && pathname !== '/login') return null;
  
  // If we have a token but no user, and useMe is still working, we can show a loader or null
  // but usually it's fast enough or we don't want to block the whole UI if some parts don't need user
  
  return <>{children}</>;
}
