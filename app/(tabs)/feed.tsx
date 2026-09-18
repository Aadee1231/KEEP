import React, { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useFeed, useToggleReaction } from '../../src/data/hooks';
import { colors, spacing } from '../../src/theme';
import { Chip, EmptyState, KText, Loading, Screen } from '../../src/ui';
import { ProofCard } from '../../src/components/ProofCard';
import type { FeedKind } from '../../src/data/types';

export default function Feed() {
  const [kind, setKind] = useState<FeedKind>('friends');
  const feed = useFeed(kind);
  const react = useToggleReaction();

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <KText variant="title">Feed</KText>
        <View style={styles.switch}>
          <Chip label="FRIENDS" active={kind === 'friends'} onPress={() => setKind('friends')} />
          <Chip label="DISCOVER" active={kind === 'discover'} onPress={() => setKind('discover')} />
        </View>
      </View>
      {feed.isPending ? (
        <Loading />
      ) : feed.isError ? (
        <EmptyState title="Couldn't load the feed." body="Pull to retry." />
      ) : (
        <FlatList
          data={feed.data ?? []}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => (
            <ProofCard post={item} onReact={(emoji) => react.mutate({ postId: item.id, emoji })} />
          )}
          contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={feed.isRefetching} onRefresh={() => feed.refetch()} tintColor={colors.ink} />
          }
          ListEmptyComponent={
            <EmptyState
              title="No proof yet."
              body="When your crew keeps their word, it shows up here."
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
  switch: { flexDirection: 'row' },
});
