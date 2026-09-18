import React from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useClerk } from '@clerk/expo';
import { useMe, useProfileStats } from '../../src/data/hooks';
import { useSession } from '../../src/data/provider';
import { isDemo } from '../../src/lib/env';
import { colors, radius, spacing } from '../../src/theme';
import { Avatar, Divider, KText, Loading, Screen, Stat } from '../../src/ui';
import { haptic } from '../../src/lib/haptics';

const COLS = 3;
const GAP = 4;

export default function You() {
  const router = useRouter();
  const me = useMe();
  const stats = useProfileStats();
  const session = useSession();

  if (me.isPending || stats.isPending) {
    return (
      <Screen>
        <Loading />
      </Screen>
    );
  }

  const p = me.data!;
  const s = stats.data!;
  const cell = (Dimensions.get('window').width - spacing.xl * 2 - GAP * (COLS - 1)) / COLS;

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={styles.identity}>
          <Avatar uri={p.avatarUrl} name={p.displayName} size={76} />
          <View style={{ flex: 1 }}>
            <KText variant="heading">{p.displayName || 'YOU'}</KText>
            <KText variant="small" color={colors.inkSoft}>
              @{p.username}
            </KText>
          </View>
          {isDemo ? (
            <Pressable
              onPress={() => {
                haptic('light');
                session.signOutDemo();
              }}
              hitSlop={10}
              accessibilityLabel="Sign out"
            >
              <Ionicons name="log-out-outline" size={22} color={colors.inkSoft} />
            </Pressable>
          ) : (
            <LiveSignOut />
          )}
        </View>

        <View style={styles.statsRow}>
          <Stat value={p.totalPoints} label="POINTS" />
          <Stat value={p.currentStreak} label="STREAK" />
          <Stat value={p.longestStreak} label="BEST" />
        </View>
        <View style={[styles.statsRow, { marginTop: spacing.lg }]}>
          <Stat value={p.keepsCount} label="KEEPS" />
          <Stat value={p.weeklyWins} label="THIS WEEK" />
          <Stat value={s.crews.length} label="CREWS" />
        </View>

        {s.commitments.length > 0 ? (
          <View style={{ marginTop: spacing.xxl }}>
            <KText variant="label" color={colors.inkFaint} style={{ marginBottom: spacing.sm }}>
              KEEPING
            </KText>
            {s.commitments.map((uc, i) => (
              <React.Fragment key={uc.id}>
                {i > 0 ? <Divider /> : null}
                <View style={styles.commitRow}>
                  <Ionicons name={uc.commitment.icon as never} size={18} color={colors.ink} />
                  <KText variant="bodyStrong" style={{ flex: 1 }}>
                    {uc.commitment.name}
                  </KText>
                  {uc.currentStreak > 0 ? (
                    <View style={styles.flame}>
                      <Ionicons name="flame" size={13} color={colors.ink} />
                      <KText variant="caption">{uc.currentStreak}</KText>
                    </View>
                  ) : null}
                  <KText variant="caption" color={colors.inkFaint}>
                    +{uc.points}
                  </KText>
                </View>
              </React.Fragment>
            ))}
          </View>
        ) : null}

        {s.crews.length > 0 ? (
          <View style={{ marginTop: spacing.xxl }}>
            <KText variant="label" color={colors.inkFaint} style={{ marginBottom: spacing.sm }}>
              CREWS
            </KText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {s.crews.map((c) => (
                <Pressable key={c.id} onPress={() => router.push(`/crew/${c.id}`)} style={styles.crewChip}>
                  <KText variant="labelSmall">{c.name}</KText>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        <View style={{ marginTop: spacing.xxl }}>
          <KText variant="label" color={colors.inkFaint} style={{ marginBottom: spacing.sm }}>
            PROOF
          </KText>
          {s.proofGrid.length === 0 ? (
            <KText variant="small" color={colors.inkFaint}>
              Your keeps will show up here. Receipts, basically.
            </KText>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GAP }}>
              {s.proofGrid.map((post) => (
                <Pressable key={post.id} onPress={() => router.push(`/post/${post.id}`)}>
                  <Image
                    source={{ uri: post.photoUrl }}
                    style={{ width: cell, height: cell, borderRadius: radius.sm, backgroundColor: colors.boneDeep }}
                    contentFit="cover"
                  />
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

function LiveSignOut() {
  const { signOut } = useClerk();
  return (
    <Pressable
      onPress={() => {
        haptic('light');
        void signOut();
      }}
      hitSlop={10}
      accessibilityLabel="Sign out"
    >
      <Ionicons name="log-out-outline" size={22} color={colors.inkSoft} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingTop: spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    paddingRight: spacing.lg,
  },
  commitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  flame: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.lime,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginRight: spacing.sm,
  },
  crewChip: {
    borderWidth: 1.5,
    borderColor: colors.ink,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});
