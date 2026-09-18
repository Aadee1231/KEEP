import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../../src/theme';
import { KText } from '../../src/ui';
import { haptic } from '../../src/lib/haptics';

const TABS: { name: string; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { name: 'index', label: 'HOME', icon: 'home-outline' },
  { name: 'feed', label: 'FEED', icon: 'albums-outline' },
  { name: '__keep', label: 'KEEP', icon: 'add' },
  { name: 'crews', label: 'CREWS', icon: 'people-outline' },
  { name: 'you', label: 'YOU', icon: 'person-outline' },
];

interface TabBarProps {
  state: { index: number; routes: { key: string; name: string }[] };
  navigation: { navigate(name: string): void };
}

function KeepTabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
      {TABS.map((t) => {
        if (t.name === '__keep') {
          return (
            <Pressable
              key="__keep"
              onPress={() => {
                haptic('heavy');
                router.push('/keep');
              }}
              style={styles.keepWrap}
              accessibilityRole="button"
              accessibilityLabel="Keep a commitment"
            >
              <View style={styles.keepBtn}>
                <KText variant="label" color={colors.ink}>
                  KEEP
                </KText>
              </View>
            </Pressable>
          );
        }
        const index = state.routes.findIndex((r) => r.name === t.name);
        const focused = state.index === index;
        return (
          <Pressable
            key={t.name}
            onPress={() => {
              if (!focused && index >= 0) navigation.navigate(t.name);
            }}
            style={styles.item}
            accessibilityRole="button"
            accessibilityLabel={t.label}
            accessibilityState={{ selected: focused }}
          >
            <Ionicons name={t.icon} size={22} color={focused ? colors.ink : colors.inkFaint} />
            <KText variant="labelSmall" color={focused ? colors.ink : colors.inkFaint}>
              {t.label}
            </KText>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <KeepTabBar {...props} />}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="feed" />
      <Tabs.Screen name="crews" />
      <Tabs.Screen name="you" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bone,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    paddingTop: spacing.sm,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    paddingVertical: spacing.xs,
  },
  keepWrap: { flex: 1, alignItems: 'center' },
  keepBtn: {
    backgroundColor: colors.lime,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.ink,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    // hard offset shadow — brutalist accent
    boxShadow: `3px 3px 0 ${colors.ink}`,
  },
});
