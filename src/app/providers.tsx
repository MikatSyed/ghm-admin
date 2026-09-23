'use client';

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';
import AuthGate from '@/components/AuthGate';
import { useAuth } from '@/store/useAuth';

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // Short staleness window. Cached data is shown immediately on mount
        // (no flash) but is treated as stale within seconds, so the next
        // mount or focus triggers a background refetch.
        staleTime: 5 * 1000,
        // Refetch every time a query mounts. Ensures Products / Stock pages
        // pick up changes made on another page (e.g. a stock adjustment or
        // a distribution dispatch) the moment the user navigates back, even
        // if the originating mutation's invalidation didn't reach this query.
        refetchOnMount: 'always',
        // Refetch when the tab regains focus, so a long-idle tab doesn't show
        // stale data after the user returns.
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        retry: (count, err: unknown) => {
          const status = (err as { status?: number })?.status;
          if (status === 401 || status === 403 || status === 404) return false;
          return count < 2;
        },
      },
    },
    queryCache: new QueryCache({
      onError: (err: unknown) => {
        const status = (err as { status?: number })?.status;
        if (status === 401) {
          useAuth.getState().logout();
        }
      },
    }),
    mutationCache: new MutationCache({
      onError: (err: unknown) => {
        const status = (err as { status?: number })?.status;
        if (status === 401) {
          useAuth.getState().logout();
        }
      },
    }),
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <AuthGate>{children}</AuthGate>
    </QueryClientProvider>
  );
}
