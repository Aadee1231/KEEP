import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useApi, useSession } from '../src/data/provider';
import { isDemo } from '../src/lib/env';
import { colors, radius, spacing } from '../src/theme';
import { Avatar, Button, Chip, KText, Screen } from '../src/ui';
import { haptic } from '../src/lib/haptics';
import type { Commitment } from '../src/data/types';

type Step = 'identity' | 'commitments' | 'crew';

export default function Onboarding() {
  const api = useApi();
  const session = useSession();
  const router = useRouter();
  const [step, setStep] = useState<Step>('identity');

  // identity
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // commitments
  const [catalogue, setCatalogue] = useState<Commitment[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());

  // crew
  const [crewName, setCrewName] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  React.useEffect(() => {
    if (step === 'commitments' && catalogue.length === 0) {
      void api.listCatalogue().then(setCatalogue);
    }
  }, [step, api, catalogue.length]);

  const categories = useMemo(
    () => [...new Set(catalogue.map((c) => c.category))],
    [catalogue],
  );

  async function pickPhoto() {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', quality: 0.8, allowsEditing: true, aspect: [1, 1] });
    if (!res.canceled) setAvatarUri(res.assets[0].uri);
  }

  async function saveIdentity() {
    if (username.trim().length < 3) {
      setError('username needs 3+ characters');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await api.updateProfile({ username: username.trim(), displayName: displayName.trim() || username.trim(), avatarUri });
      setStep('commitments');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That username is taken');
    } finally {
      setBusy(false);
    }
  }

  async function saveCommitments() {
    setBusy(true);
    try {
      for (const id of picked) {
        await api.addCommitment({ commitmentId: id });
      }
      setStep('crew');
    } finally {
      setBusy(false);
    }
  }

  async function finish(kind: 'create' | 'join' | 'skip') {
    setError(null);
    setBusy(true);
    try {
      if (kind === 'create' && crewName.trim()) await api.createCrew(crewName.trim());
      if (kind === 'join' && inviteCode.trim()) await api.joinCrew(inviteCode.trim());
      if (isDemo) await session.demoFinishOnboarding();
      else {
        await api.updateProfile({});
        session.setStatus('ready');
      }
      router.replace('/(tabs)');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.progress}>
        {(['identity', 'commitments', 'crew'] as Step[]).map((s, i) => (
          <View key={s} style={[styles.progressDot, s === step && styles.progressDotActive]} />
        ))}
      </View>

      {step === 'identity' ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <KText variant="label" color={colors.inkFaint}>
            WHO ARE YOU
          </KText>
          <KText variant="title" style={{ marginTop: spacing.sm, marginBottom: spacing.xl }}>
            Claim your name.
          </KText>
          <Pressable onPress={pickPhoto} style={styles.avatarPick} accessibilityLabel="Pick profile photo">
            <Avatar uri={avatarUri} name={displayName || username || '?'} size={84} />
            <View style={styles.avatarEdit}>
              <Ionicons name="camera" size={14} color={colors.ink} />
            </View>
          </Pressable>
          <TextInput
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="display name"
            placeholderTextColor={colors.inkFaint}
            style={styles.input}
            autoCapitalize="words"
            accessibilityLabel="Display name"
          />
          <TextInput
            value={username}
            onChangeText={(t) => setUsername(t.replace(/[^a-zA-Z0-9_]/g, ''))}
            placeholder="username"
            placeholderTextColor={colors.inkFaint}
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Username"
          />
          {error ? <KText variant="small" color={colors.danger}>{error}</KText> : null}
          <Button label="CONTINUE" onPress={saveIdentity} loading={busy} style={{ marginTop: spacing.md }} />
        </View>
      ) : null}

      {step === 'commitments' ? (
        <View style={{ flex: 1 }}>
          <KText variant="label" color={colors.inkFaint}>
            STEP 2
          </KText>
          <KText variant="title" style={{ marginTop: spacing.sm }}>
            What are you trying to keep?
          </KText>
          <KText variant="small" color={colors.inkSoft} style={{ marginTop: spacing.sm, marginBottom: spacing.lg }}>
            Pick at least one. You can add more later.
          </KText>
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            {categories.map((cat) => (
              <View key={cat} style={{ marginBottom: spacing.lg }}>
                <KText variant="labelSmall" color={colors.inkFaint} style={{ marginBottom: spacing.sm }}>
                  {cat.toUpperCase()}
                </KText>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                  {catalogue
                    .filter((c) => c.category === cat)
                    .map((c) => {
                      const active = picked.has(c.id);
                      return (
                        <Chip
                          key={c.id}
                          label={c.name}
                          active={active}
                          onPress={() => {
                            haptic('selection');
                            setPicked((prev) => {
                              const next = new Set(prev);
                              if (next.has(c.id)) next.delete(c.id);
                              else next.add(c.id);
                              return next;
                            });
                          }}
                        />
                      );
                    })}
                </View>
              </View>
            ))}
          </ScrollView>
          <Button
            label={picked.size > 0 ? `KEEP ${picked.size} THING${picked.size > 1 ? 'S' : ''}` : 'PICK ONE TO CONTINUE'}
            onPress={saveCommitments}
            disabled={picked.size === 0}
            loading={busy}
            style={{ marginBottom: spacing.lg }}
          />
        </View>
      ) : null}

      {step === 'crew' ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <KText variant="label" color={colors.inkFaint}>
            LAST STEP
          </KText>
          <KText variant="title" style={{ marginTop: spacing.sm }}>
            Find your crew.
          </KText>
          <KText variant="small" color={colors.inkSoft} style={{ marginTop: spacing.sm, marginBottom: spacing.xl }}>
            Accountability works better with witnesses.
          </KText>
          <TextInput
            value={crewName}
            onChangeText={setCrewName}
            placeholder="name a new crew"
            placeholderTextColor={colors.inkFaint}
            style={styles.input}
            autoCapitalize="characters"
            accessibilityLabel="New crew name"
          />
          <Button
            label="CREATE CREW"
            variant="primary"
            onPress={() => finish('create')}
            disabled={!crewName.trim()}
            loading={busy}
            style={{ marginTop: spacing.md }}
          />
          <View style={styles.orRow}>
            <View style={styles.orLine} />
            <KText variant="labelSmall" color={colors.inkFaint}>OR</KText>
            <View style={styles.orLine} />
          </View>
          <TextInput
            value={inviteCode}
            onChangeText={setInviteCode}
            placeholder={isDemo ? 'invite code (try WOLF42)' : 'invite code'}
            placeholderTextColor={colors.inkFaint}
            style={styles.input}
            autoCapitalize="characters"
            accessibilityLabel="Invite code"
          />
          <Button
            label="JOIN CREW"
            variant="outline"
            onPress={() => finish('join')}
            disabled={!inviteCode.trim()}
            loading={busy}
            style={{ marginTop: spacing.md }}
          />
          {error ? <KText variant="small" color={colors.danger} style={{ marginTop: spacing.sm }}>{error}</KText> : null}
          <Pressable onPress={() => finish('skip')} style={{ marginTop: spacing.xl }} accessibilityLabel="Skip for now">
            <KText variant="small" color={colors.inkFaint} style={{ textAlign: 'center' }}>
              skip for now
            </KText>
          </Pressable>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  progress: { flexDirection: 'row', gap: spacing.sm, paddingTop: spacing.sm },
  progressDot: { width: 24, height: 3, backgroundColor: colors.line, borderRadius: 2 },
  progressDotActive: { backgroundColor: colors.ink },
  input: {
    height: 54,
    borderRadius: radius.md,
    backgroundColor: colors.paper,
    paddingHorizontal: spacing.lg,
    fontFamily: 'Archivo_500Medium',
    fontSize: 16,
    color: colors.ink,
    borderWidth: 1,
    borderColor: colors.line,
    marginTop: spacing.md,
  },
  avatarPick: { alignSelf: 'flex-start', marginBottom: spacing.lg },
  avatarEdit: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.bone,
  },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginVertical: spacing.lg },
  orLine: { flex: 1, height: 1, backgroundColor: colors.line },
});
