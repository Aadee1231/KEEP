import React, { useEffect } from 'react';
import { View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, Archivo_400Regular, Archivo_500Medium, Archivo_600SemiBold, Archivo_700Bold, Archivo_900Black } from '@expo-google-fonts/archivo';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ClerkProvider, useAuth, useUser } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { SessionProvider, useSession, buildLiveApi } from '../src/data/provider';
import { isDemo, env } from '../src/lib/env';
import { colors } from '../src/theme';

void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

/** Redirects based on session status. */
function AuthGate() {
  const { status } = useSession();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const inAuthGroup = segments[0] === 'sign-in' || segments[0] === 'onboarding';
    if (status === 'signedOut' && segments[0] !== 'sign-in') {
      router.replace('/sign-in');
    } else if (status === 'onboarding' && segments[0] !== 'onboarding') {
      router.replace('/onboarding');
    } else if (status === 'ready' && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [status, segments, router]);

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bone } }}>
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="keep" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="commitments" options={{ presentation: 'modal' }} />
      <Stack.Screen name="crew/new" options={{ presentation: 'modal' }} />
      <Stack.Screen name="crew/join" options={{ presentation: 'modal' }} />
      <Stack.Screen name="crew/[id]" />
      <Stack.Screen name="post/[id]" />
    </Stack>
  );
}

/** In live mode: mirror Clerk auth into the Session context. */
function LiveSessionSync() {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const { user, isLoaded: userLoaded } = useUser();
  const { api, setApi, setStatus, setMe } = useSession();

  useEffect(() => {
    if (!isLoaded || !userLoaded) return;
    if (!isSignedIn || !user) {
      setApi(null);
      setMe(null);
      setStatus('signedOut');
      return;
    }
    if (!api) {
      setApi(
        buildLiveApi(
          { id: user.id, fullName: user.fullName, imageUrl: user.imageUrl },
          () => getToken(),
        ),
      );
      return;
    }
    let cancelled = false;
    void api.getMe().then((me) => {
      if (cancelled) return;
      setMe(me);
      setStatus(me.onboarded ? 'ready' : 'onboarding');
    });
    return () => {
      cancelled = true;
    };
  }, [isLoaded, userLoaded, isSignedIn, user, api, getToken, setApi, setStatus, setMe]);

  return <AuthGate />;
}

function RootNav() {
  const [fontsLoaded] = useFonts({
    Archivo_400Regular,
    Archivo_500Medium,
    Archivo_600SemiBold,
    Archivo_700Bold,
    Archivo_900Black,
  });

  useEffect(() => {
    if (fontsLoaded) void SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: colors.bone }} />;
  }

  return (
    <>
      <StatusBar style="dark" />
      {isDemo ? <AuthGate /> : <LiveSessionSync />}
    </>
  );
}

export default function RootLayout() {
  const tree = (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <RootNav />
      </SessionProvider>
    </QueryClientProvider>
  );
  if (isDemo) return tree;
  return (
    <ClerkProvider publishableKey={env.clerkPublishableKey} tokenCache={tokenCache}>
      {tree}
    </ClerkProvider>
  );
}
