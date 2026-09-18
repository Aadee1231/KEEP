import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, hitSlop } from '../theme';
import { haptic } from '../lib/haptics';
import { KText } from './KText';

export function Divider({ style }: { style?: ViewStyle }) {
  return <View style={[{ height: StyleSheet.hairlineWidth * 1.5, backgroundColor: colors.line }, style]} />;
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  return (
    <Pressable
      onPress={() => {
        haptic('selection');
        onPress?.();
      }}
      hitSlop={hitSlop}
      style={[styles.chip, active && styles.chipActive]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <KText variant="label" color={active ? colors.bone : colors.ink}>
        {label}
      </KText>
    </Pressable>
  );
}

export function Avatar({ uri, name, size = 40 }: { uri?: string | null; name: string; size?: number }) {
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.boneDeep }}
        contentFit="cover"
        accessibilityLabel={`${name} avatar`}
      />
    );
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.ink,
        alignItems: 'center',
        justifyContent: 'center',
      }}
      accessibilityLabel={`${name} avatar`}
    >
      <KText variant="smallStrong" color={colors.lime}>
        {initials(name)}
      </KText>
    </View>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function StreakPill({ days, accent }: { days: number; accent?: boolean }) {
  return (
    <View style={[styles.streak, accent && { backgroundColor: colors.lime }]}>
      <Ionicons name="flame" size={13} color={accent ? colors.ink : colors.lime} />
      <KText variant="labelSmall" color={accent ? colors.ink : colors.bone}>
        {days}
      </KText>
    </View>
  );
}

export function PointsTag({ points }: { points: number }) {
  return (
    <View style={styles.pointsTag}>
      <KText variant="labelSmall" color={colors.ink}>
        +{points}
      </KText>
    </View>
  );
}

export function Loading({ label }: { label?: string }) {
  return (
    <View style={styles.center} accessibilityLabel={label ?? 'Loading'}>
      <ActivityIndicator color={colors.ink} />
    </View>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={styles.empty}>
      <KText variant="heading" style={{ textAlign: 'center' }}>
        {title}
      </KText>
      {body ? (
        <KText variant="small" color={colors.inkSoft} style={{ textAlign: 'center', marginTop: spacing.sm }}>
          {body}
        </KText>
      ) : null}
      {action ? <View style={{ marginTop: spacing.lg }}>{action}</View> : null}
    </View>
  );
}

export function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <View style={{ alignItems: 'flex-start' }}>
      <KText variant="stat">{value}</KText>
      <KText variant="labelSmall" color={colors.inkFaint} style={{ marginTop: 2 }}>
        {label}
      </KText>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.ink,
    marginRight: spacing.sm,
  },
  chipActive: {
    backgroundColor: colors.ink,
  },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.ink,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pointsTag: {
    backgroundColor: colors.lime,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
});
