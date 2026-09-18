import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAddCommitment, useCatalogue, useMyCommitments } from '../src/data/hooks';
import { colors, radius, spacing } from '../src/theme';
import { Divider, KText, Loading, Screen } from '../src/ui';
import { haptic } from '../src/lib/haptics';

export default function Commitments() {
  const router = useRouter();
  const catalogue = useCatalogue();
  const mine = useMyCommitments();
  const add = useAddCommitment();

  const mineIds = useMemo(() => new Set((mine.data ?? []).map((c) => c.commitment.id)), [mine.data]);
  const categories = useMemo(
    () => [...new Set((catalogue.data ?? []).map((c) => c.category))],
    [catalogue.data],
  );

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.head}>
        <KText variant="title">Commitments</KText>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Close">
          <Ionicons name="close" size={26} color={colors.ink} />
        </Pressable>
      </View>
      <KText variant="small" color={colors.inkSoft} style={{ marginBottom: spacing.lg }}>
        Start stupidly small. Points are negotiable; your word isn&apos;t.
      </KText>
      {catalogue.isPending ? (
        <Loading />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
          {categories.map((cat) => (
            <View key={cat} style={{ marginBottom: spacing.xl }}>
              <KText variant="labelSmall" color={colors.inkFaint} style={{ marginBottom: spacing.xs }}>
                {cat.toUpperCase()}
              </KText>
              {catalogue.data!
                .filter((c) => c.category === cat)
                .map((c, i) => {
                  const added = mineIds.has(c.id);
                  return (
                    <React.Fragment key={c.id}>
                      {i > 0 ? <Divider /> : null}
                      <View style={styles.row}>
                        <View style={styles.icon}>
                          <Ionicons name={c.icon as never} size={20} color={colors.ink} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <KText variant="bodyStrong">{c.name}</KText>
                          <KText variant="caption" color={colors.inkFaint}>
                            +{c.points}
                            {c.proofRequired ? ' · PHOTO PROOF' : ' · HONOR SYSTEM'}
                          </KText>
                        </View>
                        <Pressable
                          onPress={() => {
                            if (!added) {
                              haptic('medium');
                              add.mutate({ commitmentId: c.id });
                            }
                          }}
                          style={[styles.addBtn, added && styles.addedBtn]}
                          accessibilityRole="button"
                          accessibilityLabel={added ? `${c.name} added` : `Add ${c.name}`}
                          accessibilityState={{ disabled: added }}
                        >
                          <Ionicons name={added ? 'checkmark' : 'add'} size={18} color={added ? colors.ink : colors.bone} />
                        </Pressable>
                      </View>
                    </React.Fragment>
                  );
                })}
            </View>
          ))}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.boneDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtn: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addedBtn: {
    backgroundColor: colors.lime,
  },
});
