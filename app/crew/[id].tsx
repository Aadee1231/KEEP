import React from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCrewDetail, useLeaveCrew, useToggleReaction } from '../../src/data/hooks';
import { colors, radius, spacing } from '../../src/theme';
import { Avatar, Button, Divider, KText, Loading, Screen, StreakPill } from '../../src/ui';
import { ProofCard } from '../../src/components/ProofCard';
import { haptic } from '../../src/lib/haptics';

export default function CrewDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const detail = useCrewDetail(id!);
  const leave = useLeaveCrew();
  const react = useToggleReaction();

  if (detail.isPending) {
    return (
      <Screen>
        <Loading />
      </Screen>
    );
  }
  if (detail.isError || !detail.data) {
    return (
      <Screen>
        <KText variant="small" color={colors.danger} style={{ marginTop: spacing.xxl }}>
          Couldn&apos;t load this crew.
        </KText>
        <Button label="GO BACK" variant="ghost" onPress={() => router.back()} />
      </Screen>
    );
  }

  const { crew, members, recentPosts } = detail.data;
  const cell = 44;

  function confirmLeave() {
    Alert.alert(`Leave ${crew.name}?`, 'You will lose the crew streak.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          await leave.mutateAsync(crew.id);
          router.back();
        },
      },
    ]);
  }

  return (
    <Screen padded={false}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingBottom: 120 }}
      >
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Back">
            <Ionicons name="arrow-back" size={24} color={colors.ink} />
          </Pressable>
          <Pressable onPress={confirmLeave} hitSlop={10} accessibilityLabel="Leave crew">
            <KText variant="labelSmall" color={colors.inkFaint}>
              LEAVE
            </KText>
          </Pressable>
        </View>

        <KText variant="hero" style={{ fontSize: 44 }}>{crew.name}</KText>
        <View style={styles.metaRow}>
          <KText variant="labelSmall" color={colors.inkSoft}>
            {members.length} MEMBERS
          </KText>
          {crew.crewStreak > 0 ? <StreakPill days={crew.crewStreak} accent /> : null}
        </View>

        <Pressable
          onPress={() => {
            haptic('light');
            void Share.share({ message: `Join my crew "${crew.name}" on KEEP — code: ${crew.inviteCode}` });
          }}
          style={styles.invite}
          accessibilityRole="button"
          accessibilityLabel={`Invite code ${crew.inviteCode}`}
        >
          <View>
            <KText variant="labelSmall" color={colors.inkFaint}>
              INVITE CODE
            </KText>
            <KText variant="heading" style={{ letterSpacing: 4 }}>
              {crew.inviteCode}
            </KText>
          </View>
          <Ionicons name="share-outline" size={20} color={colors.ink} />
        </Pressable>

        <View style={{ marginTop: spacing.xl }}>
          <KText variant="label" color={colors.inkFaint} style={{ marginBottom: spacing.xs }}>
            LEADERBOARD · THIS WEEK
          </KText>
          {members.map((m, i) => (
            <React.Fragment key={m.user.id}>
              {i > 0 ? <Divider /> : null}
              <View style={styles.memberRow}>
                <KText variant="smallStrong" color={colors.inkFaint} style={{ width: 20 }}>
                  {i + 1}
                </KText>
                <Avatar uri={m.user.avatarUrl} name={m.user.displayName} size={cell * 0.8} />
                <KText variant="bodyStrong" style={{ flex: 1 }}>
                  {m.user.displayName}
                  {m.role === 'owner' ? ' ' : ''}
                  {m.role === 'owner' ? (
                    <KText variant="caption" color={colors.inkFaint}>
                      · owner
                    </KText>
                  ) : null}
                </KText>
                <KText variant="bodyStrong">{m.weekPoints}</KText>
              </View>
            </React.Fragment>
          ))}
        </View>

        {recentPosts.length > 0 ? (
          <View style={{ marginTop: spacing.xxl }}>
            <KText variant="label" color={colors.inkFaint} style={{ marginBottom: spacing.lg }}>
              CREW PROOF
            </KText>
            {recentPosts.map((p) => (
              <ProofCard key={p.id} post={p} onReact={(emoji) => react.mutate({ postId: p.id, emoji })} />
            ))}
          </View>
        ) : (
          <KText variant="small" color={colors.inkFaint} style={{ marginTop: spacing.xxl }}>
            No proof yet — somebody has to go first.
          </KText>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  invite: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.lime,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    marginTop: spacing.xl,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
});
