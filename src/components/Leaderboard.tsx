import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../theme';
import type { LeaderboardEntry } from '../data/types';
import { Avatar, Divider, KText } from '../ui';

export function Leaderboard({ entries, limit }: { entries: LeaderboardEntry[]; limit?: number }) {
  const rows = limit ? entries.slice(0, limit) : entries;
  return (
    <View>
      {rows.map((e, i) => (
        <React.Fragment key={e.user.id}>
          {i > 0 ? <Divider /> : null}
          <View style={styles.row}>
            <KText variant="smallStrong" color={colors.inkFaint} style={{ width: 22 }}>
              {i + 1}
            </KText>
            <Avatar uri={e.user.avatarUrl} name={e.user.displayName} size={34} />
            <View style={{ flex: 1 }}>
              <KText variant="bodyStrong">
                {e.isMe ? 'YOU' : e.user.displayName}
              </KText>
            </View>
            {e.streak > 0 ? (
              <View style={styles.streak}>
                <Ionicons name="flame" size={12} color={colors.ink} />
                <KText variant="caption">{e.streak}</KText>
              </View>
            ) : null}
            <KText variant="bodyStrong">{e.points}</KText>
          </View>
        </React.Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginRight: spacing.sm,
  },
});
