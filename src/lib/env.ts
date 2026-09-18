export const env = {
  clerkPublishableKey: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '',
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  dataMode: process.env.EXPO_PUBLIC_DATA_MODE ?? '',
};

export const isDemo =
  env.dataMode === 'demo' ||
  !env.clerkPublishableKey ||
  !env.supabaseUrl ||
  !env.supabaseAnonKey;
