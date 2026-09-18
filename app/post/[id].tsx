import React, { useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAddComment, useComments, useFeed, useToggleReaction } from '../../src/data/hooks';
import { colors, radius, spacing } from '../../src/theme';
import { Avatar, KText, Loading, Screen } from '../../src/ui';
import { ProofCard } from '../../src/components/ProofCard';
import { timeAgo } from '../../src/lib/format';
import { haptic } from '../../src/lib/haptics';

export default function PostDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  // pull the post from whichever feed cache has it; fall back to friends
  const friends = useFeed('friends');
  const post = friends.data?.find((p) => p.id === id);
  const comments = useComments(id!);
  const addComment = useAddComment(id!);
  const react = useToggleReaction();
  const [draft, setDraft] = useState('');

  function send() {
    const body = draft.trim();
    if (!body) return;
    haptic('light');
    addComment.mutate(body);
    setDraft('');
  }

  return (
    <Screen padded={false} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          data={comments.data ?? []}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <>
              <View style={styles.topBar}>
                <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Back">
                  <Ionicons name="arrow-back" size={24} color={colors.ink} />
                </Pressable>
              </View>
              {post ? (
                <ProofCard post={post} onReact={(emoji) => react.mutate({ postId: post.id, emoji })} />
              ) : (
                <Loading />
              )}
              <KText variant="label" color={colors.inkFaint} style={{ marginBottom: spacing.md }}>
                COMMENTS
              </KText>
            </>
          }
          renderItem={({ item }) => (
            <View style={styles.comment}>
              <Avatar uri={item.user.avatarUrl} name={item.user.displayName} size={28} />
              <View style={{ flex: 1 }}>
                <KText variant="smallStrong">
                  {item.user.displayName}{' '}
                  <KText variant="caption" color={colors.inkFaint}>
                    {timeAgo(item.createdAt)}
                  </KText>
                </KText>
                <KText variant="small" style={{ marginTop: 2 }}>
                  {item.body}
                </KText>
              </View>
            </View>
          )}
          ListEmptyComponent={
            comments.isPending ? null : (
              <KText variant="small" color={colors.inkFaint}>
                No comments yet. Hype them up.
              </KText>
            )
          }
        />
        <View style={styles.composer}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="say something"
            placeholderTextColor={colors.inkFaint}
            style={styles.input}
            maxLength={280}
            accessibilityLabel="Add comment"
            onSubmitEditing={send}
            returnKeyType="send"
          />
          <Pressable onPress={send} hitSlop={10} accessibilityLabel="Send comment" disabled={!draft.trim()}>
            <Ionicons name="arrow-up" size={22} color={draft.trim() ? colors.ink : colors.inkFaint} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: { paddingTop: spacing.lg, marginBottom: spacing.lg },
  comment: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    backgroundColor: colors.bone,
  },
  input: {
    flex: 1,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.paper,
    paddingHorizontal: spacing.lg,
    fontFamily: 'Archivo_500Medium',
    fontSize: 15,
    color: colors.ink,
    borderWidth: 1,
    borderColor: colors.line,
  },
});
