import React, { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useJoinCrew } from '../../src/data/hooks';
import { isDemo } from '../../src/lib/env';
import { colors, radius, spacing } from '../../src/theme';
import { Button, KText, Screen } from '../../src/ui';

export default function JoinCrew() {
  const router = useRouter();
  const join = useJoinCrew();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    try {
      const crew = await join.mutateAsync(code.trim());
      router.replace(`/crew/${crew.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not join crew');
    }
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <KText variant="label" color={colors.inkFaint}>
          JOIN A CREW
        </KText>
        <KText variant="title" style={{ marginTop: spacing.sm, marginBottom: spacing.xl }}>
          Got a code?
        </KText>
        <TextInput
          value={code}
          onChangeText={setCode}
          placeholder={isDemo ? 'try WOLF42' : 'INVITE CODE'}
          placeholderTextColor={colors.inkFaint}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={12}
          autoFocus
          style={styles.input}
          accessibilityLabel="Invite code"
        />
        {error ? <KText variant="small" color={colors.danger} style={{ marginTop: spacing.sm }}>{error}</KText> : null}
        <Button
          label="JOIN"
          onPress={submit}
          disabled={!code.trim()}
          loading={join.isPending}
          style={{ marginTop: spacing.lg }}
        />
        <Button label="CANCEL" variant="ghost" onPress={() => router.back()} style={{ marginTop: spacing.sm }} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    height: 54,
    borderRadius: radius.md,
    backgroundColor: colors.paper,
    paddingHorizontal: spacing.lg,
    fontFamily: 'Archivo_700Bold',
    fontSize: 18,
    letterSpacing: 2,
    color: colors.ink,
    borderWidth: 1,
    borderColor: colors.line,
  },
});
