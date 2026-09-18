import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, radius, spacing } from '../theme';
import type { ProofPost } from '../data/types';
import { timeAgo } from '../lib/format';
import { haptic } from '../lib/haptics';
import { Avatar, KText } from '../ui';

export const REACTION_EMOJIS = ['🔥', '💪', '👏', '😤'];

export function ProofCard({
  post,
  onReact,
}: {
  post: ProofPost;
  onReact?: (emoji: string) => void;
}) {
  const router = useRouter();
  return (
    <View style={styles.card}>
      <Pressable
        onPress={() => router.push(`/post/${post.id}`)}
        accessibilityLabel={`${post.user.displayName} kept ${post.commitmentName}`}
      >
        <View style={styles.header}>
          <Avatar uri={post.user.avatarUrl} name={post.user.displayName} size={34} />
          <View style={{ flex: 1 }}>
            <KText variant="bodyStrong">
              {post.user.displayName} <KText color={colors.inkSoft}>kept</KText>{' '}
              <KText variant="bodyStrong">{post.commitmentName}</KText>
            </KText>
            <KText variant="caption" color={colors.inkFaint}>
              {timeAgo(post.createdAt)}
            </KText>
          </View>
          <View style={styles.streak}>
            <Ionicons name="flame" size={13} color={colors.ink} />
            <KText variant="labelSmall">{post.streakAfter} DAY</KText>
          </View>
        </View>

        <Image source={{ uri: post.photoUrl }} style={styles.photo} contentFit="cover" transition={150} />

        {post.caption ? (
          <KText variant="small" style={{ marginTop: spacing.sm }}>
            {post.caption}
          </KText>
        ) : null}
      </Pressable>

      <View style={styles.actions}>
        {REACTION_EMOJIS.map((emoji) => {
          const r = post.reactions.find((x) => x.emoji === emoji);
          const active = !!r?.mine;
          return (
            <Pressable
              key={emoji}
              hitSlop={8}
              onPress={() => {
                haptic('light');
                onReact?.(emoji);
              }}
              style={[styles.reaction, active && styles.reactionActive]}
              accessibilityRole="button"
              accessibilityLabel={`React ${emoji}`}
            >
              <KText variant="small">{emoji}</KText>
              {r && r.count > 0 ? (
                <KText variant="caption" color={active ? colors.ink : colors.inkFaint}>
                  {r.count}
                </KText>
              ) : null}
            </Pressable>
          );
        })}
        <View style={{ flex: 1 }} />
        <Pressable
          hitSlop={8}
          onPress={() => router.push(`/post/${post.id}`)}
          style={styles.commentBtn}
          accessibilityRole="button"
          accessibilityLabel={`${post.commentCount} comments`}
        >
          <Ionicons name="chatbubble-outline" size={17} color={colors.inkSoft} />
          {post.commentCount > 0 ? (
            <KText variant="caption" color={colors.inkSoft}>
              {post.commentCount}
            </KText>
          ) : null}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.xxl },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.lime,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  photo: {
    width: '100%',
    aspectRatio: 4 / 5,
    borderRadius: radius.lg,
    backgroundColor: colors.boneDeep,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  reaction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.line,
  },
  reactionActive: {
    backgroundColor: colors.lime,
    borderColor: colors.lime,
  },
  commentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
});
