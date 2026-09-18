import React from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMyCrews } from '../../src/data/hooks';
import { colors, radius, spacing } from '../../src/theme';
import { Button, Divider, EmptyState, KText, Loading, Screen, StreakPill } from '../../src/ui';
import type { Crew } from '../../src/data/types';

function CrewRow({ crew, onPress }: { crew: Crew; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
      accessibilityRole="button"
      accessibilityLabel={`${crew.name}, ${crew.memberCount} members`}
    >
      <View style={{ flex: 1 }}>
        <KText variant="heading">{crew.name}</KText>
        <KText variant="caption" color={colors.inkSoft} style={{ marginTop: 2 }}>
          {crew.memberCount} MEMBER{crew.memberCount === 1 ? '' : 'S'}
        </KText>
      </View>
      {crew.crewStreak > 0 ? <StreakPill days={crew.crewStreak} accent /> : null}
      <Ionicons name="chevron-forward" size={18} color={colors.inkFaint} style={{ marginLeft: spacing.sm }} />
    </Pressable>
  );
}

export default function Crews() {
  const router = useRouter();
  const crews = useMyCrews();

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <KText variant="title">Crews</KText>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Pressable
            onPress={() => router.push('/crew/join')}
            style={styles.headerBtn}
            accessibilityLabel="Join crew"
          >
            <KText variant="labelSmall">JOIN</KText>
          </Pressable>
          <Pressable
            onPress={() => router.push('/crew/new')}
            style={[styles.headerBtn, styles.headerBtnDark]}
            accessibilityLabel="Create crew"
          >
            <KText variant="labelSmall" color={colors.bone}>
              NEW
            </KText>
          </Pressable>
        </View>
      </View>
      {crews.isPending ? (
        <Loading />
      ) : (
        <FlatList
          data={crews.data ?? []}
          keyExtractor={(c) => c.id}
          renderItem={({ item, index }) => (
            <>
              {index > 0 ? <Divider /> : null}
              <CrewRow crew={item} onPress={() => router.push(`/crew/${item.id}`)} />
            </>
          )}
          contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              title="No crew yet."
              body="Make one. Invite people who will call you out."
              action={
                <View style={{ gap: spacing.sm, width: '100%' }}>
                  <Button label="CREATE A CREW" onPress={() => router.push('/crew/new')} />
                  <Button label="JOIN WITH CODE" variant="outline" onPress={() => router.push('/crew/join')} />
                </View>
              }
            />
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  headerBtn: {
    borderWidth: 1.5,
    borderColor: colors.ink,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerBtnDark: {
    backgroundColor: colors.ink,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
});
