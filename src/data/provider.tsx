import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { KeepApi } from './api';
import type { Profile } from './types';
import { DemoApi } from './demo';
import { SupabaseApi } from './supabaseApi';
import { getSupabase } from '../lib/supabase';
import { isDemo } from '../lib/env';

export type SessionStatus = 'signedOut' | 'onboarding' | 'ready';

interface Session {
  status: SessionStatus;
  api: KeepApi | null;
  me: Profile | null;
  setApi(api: KeepApi | null): void;
  setMe(me: Profile | null): void;
  setStatus(s: SessionStatus): void;
  demoSignIn(name: string): void;
  demoFinishOnboarding(): Promise<void>;
  signOutDemo(): void;
}

const Ctx = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [api, setApi] = useState<KeepApi | null>(isDemo ? new DemoApi() : null);
  const [me, setMe] = useState<Profile | null>(null);
  const [status, setStatus] = useState<SessionStatus>('signedOut');
  const qc = useQueryClient();

  const demoSignIn = useCallback(
    (name: string) => {
      const demo = api as DemoApi;
      demo.signInDemo(name);
      setStatus('onboarding');
    },
    [api],
  );

  const demoFinishOnboarding = useCallback(async () => {
    const demo = api as DemoApi;
    await demo.finishOnboarding();
    setMe(await demo.getMe());
    qc.clear();
    setStatus('ready');
  }, [api, qc]);

  const signOutDemo = useCallback(() => {
    const demo = api as DemoApi;
    demo.signOut();
    qc.clear();
    setMe(null);
    setStatus('signedOut');
  }, [api, qc]);

  const value = useMemo(
    () => ({ status, api, me, setApi, setMe, setStatus, demoSignIn, demoFinishOnboarding, signOutDemo }),
    [status, api, me, demoSignIn, demoFinishOnboarding, signOutDemo],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): Session {
  const s = useContext(Ctx);
  if (!s) throw new Error('useSession outside provider');
  return s;
}

export function useApi(): KeepApi {
  const { api } = useSession();
  if (!api) throw new Error('API not ready');
  return api;
}

/** Build the live Supabase-backed API for a signed-in Clerk user. */
export function buildLiveApi(clerkUser: {
  id: string;
  fullName?: string | null;
  imageUrl?: string | null;
}, getToken: () => Promise<string | null>): KeepApi {
  return new SupabaseApi(getSupabase(getToken), clerkUser);
}
