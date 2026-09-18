import React, { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useCreateCrew } from '../../src/data/hooks';
import { colors, radius, spacing } from '../../src/theme';
import { Button, KText, Screen } from '../../src/ui';

export default function NewCrew() {
  const router = useRouter();
  const create = useCreateCrew();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    try {
      const crew = await create.mutateAsync(name.trim());
      router.replace(`/crew/${crew.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create crew');
    }
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <KText variant="label" color={colors.inkFaint}>
          NEW CREW
        </KText>
        <KText variant="title" style={{ marginTop: spacing.sm, marginBottom: spacing.xl }}>
          Name it something they&apos;ll regret skipping.
        </KText>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="WOLFPACK"
          placeholderTextColor={colors.inkFaint}
          autoCapitalize="characters"
          maxLength={40}
          autoFocus
          style={styles.input}
          accessibilityLabel="Crew name"
        />
        {error ? <KText variant="small" color={colors.danger} style={{ marginTop: spacing.sm }}>{error}</KText> : null}
        <Button
          label="CREATE"
          onPress={submit}
          disabled={!name.trim()}
          loading={create.isPending}
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
    letterSpacing: 1,
    color: colors.ink,
    borderWidth: 1,
    borderColor: colors.line,
  },
});
