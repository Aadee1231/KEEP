import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useToday, useMe } from '../../src/data/hooks';
import { colors, spacing } from '../../src/theme';
import { Button, Divider, EmptyState, KText, Loading, Screen } from '../../src/ui';
import { CommitmentRow } from '../../src/components/CommitmentRow';
import { Leaderboard } from '../../src/components/Leaderboard';
import type { UserCommitment } from '../../src/data/types';

export default function Home() {
  const router = useRouter();
  const today = useToday();
  const me = useMe();

  if (today.isPending || me.isPending) {
    return (
      <Screen>
        <Loading />
      </Screen>
    );
  }

  const data = today.data!;
  const allKept = data.totalCount > 0 && data.keptCount === data.totalCount;

  function startKeep(item?: UserCommitment) {
    router.push({ pathname: '/keep', params: item ? { commitmentId: item.id } : {} });
  }

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={styles.header}>
          <View>
            <KText variant="labelSmall" color={colors.inkFaint}>
              {data.dateLabel}
            </KText>
            <KText variant="hero" style={{ marginTop: 4 }}>
              {data.keptCount}
              <KText variant="hero" color={colors.inkFaint}>
                {' / '}
                {data.totalCount}
              </KText>
            </KText>
            <KText variant="label" color={allKept ? colors.ink : colors.inkSoft}>
              {allKept ? 'ALL KEPT' : 'KEPT'}
            </KText>
          </View>
          <View style={{ alignItems: 'flex-end', gap: spacing.sm }}>
            {me.data && me.data.currentStreak > 0 ? (
              <View style={styles.streakBadge}>
                <Ionicons name="flame" size={15} color={colors.ink} />
                <KText variant="bodyStrong">{me.data.currentStreak}</KText>
              </View>
            ) : null}
            <KText variant="labelSmall" color={colors.inkFaint}>
              {data.pointsToday} PTS TODAY
            </KText>
          </View>
        </View>

        <View style={styles.progressTrack} accessibilityLabel={`${data.keptCount} of ${data.totalCount} kept`}>
          <View
            style={[
              styles.progressFill,
              { width: data.totalCount ? `${(data.keptCount / data.totalCount) * 100}%` : '0%' },
            ]}
          />
        </View>

        <View style={{ marginTop: spacing.xl }}>
          <KText variant="label" color={colors.inkFaint} style={{ marginBottom: spacing.sm }}>
            TODAY&apos;S PROMISES
          </KText>
          {data.commitments.length === 0 ? (
            <EmptyState
              title="Nothing to keep yet."
              body="Pick a commitment — the smaller the better."
              action={
                <Button label="BROWSE COMMITMENTS" variant="outline" onPress={() => router.push('/commitments')} />
              }
            />
          ) : (
            data.commitments.map((c, i) => (
              <React.Fragment key={c.id}>
                {i > 0 ? <Divider /> : null}
                <CommitmentRow item={c} onKeep={startKeep} />
              </React.Fragment>
            ))
          )}
          {data.commitments.length > 0 ? (
            <Pressable
              onPress={() => router.push('/commitments')}
              style={styles.addRow}
              accessibilityRole="button"
              accessibilityLabel="Add commitment"
            >
              <Ionicons name="add" size={16} color={colors.inkSoft} />
              <KText variant="smallStrong" color={colors.inkSoft}>
                add a commitment
              </KText>
            </Pressable>
          ) : null}
        </View>

        {data.leaderboard.length > 1 ? (
          <View style={{ marginTop: spacing.xxl }}>
            <KText variant="label" color={colors.inkFaint} style={{ marginBottom: spacing.sm }}>
              THIS WEEK
            </KText>
            <Leaderboard entries={data.leaderboard} limit={5} />
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingTop: spacing.lg,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.lime,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.boneDeep,
    marginTop: spacing.lg,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.ink,
    borderRadius: 3,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.lg,
  },
});
