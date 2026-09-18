import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, hitSlop } from '../theme';
import type { UserCommitment } from '../data/types';
import { haptic } from '../lib/haptics';
import { KText } from '../ui';

export function CommitmentRow({
  item,
  onKeep,
}: {
  item: UserCommitment;
  onKeep?: (item: UserCommitment) => void;
}) {
  const kept = item.keptToday;
  return (
    <View style={[styles.row, kept && styles.rowKept]}>
      <View style={styles.icon}>
        <Ionicons name={item.commitment.icon as never} size={20} color={kept ? colors.inkFaint : colors.ink} />
      </View>
      <View style={{ flex: 1 }}>
        <KText variant="bodyStrong" color={kept ? colors.inkFaint : colors.ink}>
          {item.commitment.name}
        </KText>
        <View style={styles.meta}>
          {item.currentStreak > 0 ? (
            <>
              <Ionicons name="flame" size={12} color={kept ? colors.inkFaint : colors.ink} />
              <KText variant="caption" color={kept ? colors.inkFaint : colors.inkSoft}>
                {item.currentStreak}
              </KText>
              <KText variant="caption" color={colors.inkFaint}>
                {' · '}
              </KText>
            </>
          ) : null}
          <KText variant="caption" color={colors.inkFaint}>
            +{item.points}
          </KText>
        </View>
      </View>
      {kept ? (
        <View style={styles.keptBadge} accessibilityLabel="Kept today">
          <KText variant="labelSmall" color={colors.ink}>
            KEPT
          </KText>
          <Ionicons name="checkmark" size={13} color={colors.ink} />
        </View>
      ) : (
        <Pressable
          onPress={() => {
            haptic('medium');
            onKeep?.(item);
          }}
          hitSlop={hitSlop}
          style={styles.keepBtn}
          accessibilityRole="button"
          accessibilityLabel={`Keep ${item.commitment.name}`}
        >
          <KText variant="label" color={colors.bone}>
            KEEP IT
          </KText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  rowKept: {},
  icon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.boneDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  keepBtn: {
    backgroundColor: colors.ink,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
  },
  keptBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.lime,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
});
