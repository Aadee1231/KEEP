import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { Ionicons } from '@expo/vector-icons';
import { useSSO, useSignIn, useSignUp } from '@clerk/expo';
import { isDemo } from '../src/lib/env';
import { useSession } from '../src/data/provider';
import { colors, radius, spacing } from '../src/theme';
import { Button, KText, Screen } from '../src/ui';
import { haptic } from '../src/lib/haptics';

WebBrowser.maybeCompleteAuthSession();

export default function SignIn() {
  return (
    <Screen edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <View style={styles.mark}>
              <View style={styles.markDot} />
            </View>
            <KText variant="display" style={{ fontSize: 88, lineHeight: 84 }}>
              KEEP
            </KText>
            <KText variant="subhead" color={colors.inkSoft} style={{ marginTop: spacing.sm }}>
              keep your word.
            </KText>
            <KText variant="small" color={colors.inkFaint} style={{ marginTop: spacing.xxl, maxWidth: 280 }}>
              Make promises with your friends. Prove you kept them.
            </KText>
          </View>
          {isDemo ? <DemoCta /> : <LiveAuth />}
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function DemoCta() {
  const session = useSession();
  return (
    <View style={{ marginBottom: spacing.lg }}>
      <Button
        label="CONTINUE"
        onPress={() => {
          haptic('success');
          session.demoSignIn('You');
        }}
      />
      <KText variant="caption" color={colors.inkFaint} style={{ textAlign: 'center', marginTop: spacing.md }}>
        demo mode — no backend connected
      </KText>
    </View>
  );
}

// Mounted only when ClerkProvider is present.
function LiveAuth() {
  const { startSSOFlow } = useSSO();
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [stage, setStage] = useState<'idle' | 'code'>('idle');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingSignUp, setPendingSignUp] = useState(false);

  async function oauth(strategy: 'oauth_apple' | 'oauth_google') {
    setError(null);
    setBusy(true);
    try {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy,
        redirectUrl: AuthSession.makeRedirectUri({ scheme: 'keep', path: 'sso-callback' }),
      });
      if (createdSessionId && setActive) await setActive({ session: createdSessionId });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in failed');
    } finally {
      setBusy(false);
    }
  }

  async function sendCode() {
    if (!email.includes('@')) {
      setError('Enter a valid email.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      // try sign-in first; if the account doesn't exist, fall through to sign-up
      const { error: err } = await signIn.create({ identifier: email });
      if (err) throw err;
      const factor = signIn.supportedFirstFactors?.find((f) => f.strategy === 'email_code');
      if (!factor) throw new Error('no email factor');
      const { error: sendErr } = await signIn.emailCode.sendCode({ emailAddress: email });
      if (sendErr) throw sendErr;
      setPendingSignUp(false);
      setStage('code');
    } catch {
      try {
        const { error: createErr } = await signUp.create({ emailAddress: email });
        if (createErr) throw createErr;
        const { error: sendErr } = await signUp.verifications.sendEmailCode();
        if (sendErr) throw sendErr;
        setPendingSignUp(true);
        setStage('code');
      } catch (e2) {
        setError(e2 instanceof Error ? e2.message : 'Could not send code');
      }
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode() {
    setError(null);
    setBusy(true);
    try {
      if (pendingSignUp) {
        const { error } = await signUp.verifications.verifyEmailCode({ code });
        if (error) throw error;
        if (signUp.status === 'complete') await signUp.finalize();
      } else {
        const { error } = await signIn.emailCode.verifyCode({ code });
        if (error) throw error;
        if (signIn.status === 'complete') await signIn.finalize();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Wrong code');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ marginBottom: spacing.lg }}>
      {error ? (
        <KText variant="small" color={colors.danger} style={{ marginBottom: spacing.md }}>
          {error}
        </KText>
      ) : null}
      {stage === 'code' ? (
        <View style={{ gap: spacing.md }}>
          <TextInput
            value={code}
            onChangeText={setCode}
            placeholder="6-digit code"
            placeholderTextColor={colors.inkFaint}
            keyboardType="number-pad"
            autoFocus
            style={styles.input}
            accessibilityLabel="Verification code"
          />
          <Button label="VERIFY" onPress={verifyCode} loading={busy} />
          <Pressable onPress={() => setStage('idle')} hitSlop={10}>
            <KText variant="small" color={colors.inkSoft} style={{ textAlign: 'center' }}>
              use a different email
            </KText>
          </Pressable>
        </View>
      ) : (
        <View style={{ gap: spacing.md }}>
          {Platform.OS === 'ios' ? (
            <Button
              label="CONTINUE WITH APPLE"
              variant="primary"
              icon={<Ionicons name="logo-apple" size={18} color={colors.bone} />}
              onPress={() => void oauth('oauth_apple')}
            />
          ) : null}
          <Button
            label="CONTINUE WITH GOOGLE"
            variant={Platform.OS === 'ios' ? 'outline' : 'primary'}
            icon={<Ionicons name="logo-google" size={16} color={Platform.OS === 'ios' ? colors.ink : colors.bone} />}
            onPress={() => void oauth('oauth_google')}
          />
          <View style={styles.orRow}>
            <View style={styles.orLine} />
            <KText variant="labelSmall" color={colors.inkFaint}>
              OR
            </KText>
            <View style={styles.orLine} />
          </View>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="email"
            placeholderTextColor={colors.inkFaint}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            style={styles.input}
            accessibilityLabel="Email address"
          />
          <Button label="CONTINUE WITH EMAIL" variant="outline" onPress={sendCode} loading={busy} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  mark: {
    width: 14,
    height: 14,
    marginBottom: spacing.lg,
  },
  markDot: {
    flex: 1,
    backgroundColor: colors.lime,
    borderRadius: 3,
    borderWidth: 2,
    borderColor: colors.ink,
  },
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
  },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  orLine: { flex: 1, height: 1, backgroundColor: colors.line },
});
