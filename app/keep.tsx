import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useMyCommitments, useSubmitKeep } from '../src/data/hooks';
import { colors, radius, spacing } from '../src/theme';
import { Button, EmptyState, KText, Loading, Screen } from '../src/ui';
import { haptic } from '../src/lib/haptics';
import type { UserCommitment } from '../src/data/types';

type Step = 'pick' | 'capture' | 'review' | 'done';

export default function KeepFlow() {
  const router = useRouter();
  const params = useLocalSearchParams<{ commitmentId?: string }>();
  const commitments = useMyCommitments();
  const submit = useSubmitKeep();

  const [step, setStep] = useState<Step>(params.commitmentId ? 'capture' : 'pick');
  const [pickedCommitment, setPickedCommitment] = useState<UserCommitment | null>(null);
  const selected =
    pickedCommitment ??
    (params.commitmentId
      ? (commitments.data?.find((c) => c.id === params.commitmentId) ?? null)
      : null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ points: number; streak: number } | null>(null);

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  // success animation
  const [scale] = useState(() => new Animated.Value(0.6));
  const [opacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (step === 'capture' && Platform.OS !== 'web' && permission && !permission.granted) {
      void requestPermission();
    }
  }, [step, permission, requestPermission]);

  useEffect(() => {
    if (step === 'done') {
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, friction: 5, tension: 90, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    }
  }, [step, scale, opacity]);

  function close() {
    router.back();
  }

  function pick(c: UserCommitment) {
    haptic('selection');
    setPickedCommitment(c);
    if (c.commitment.proofRequired) {
      setStep('capture');
    } else {
      // proof optional: still let them add a photo, but they can skip
      setStep('capture');
    }
  }

  async function fromCamera() {
    try {
      const shot = await cameraRef.current?.takePictureAsync({ quality: 0.8 });
      if (shot?.uri) {
        haptic('medium');
        setPhoto(shot.uri);
        setStep('review');
      }
    } catch {
      setError('Could not take photo. Try the library instead.');
    }
  }

  async function fromLibrary() {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', quality: 0.8 });
    if (!res.canceled) {
      setPhoto(res.assets[0].uri);
      setStep('review');
    }
  }

  async function submitKeep() {
    if (!selected) return;
    setError(null);
    try {
      const res = await submit.mutateAsync({
        userCommitmentId: selected.id,
        photoUri: photo ?? '',
        caption: caption.trim() || undefined,
      });
      haptic('success');
      setResult({ points: res.pointsAwarded, streak: res.newStreak });
      setStep('done');
    } catch (e) {
      haptic('warning');
      setError(e instanceof Error ? e.message : 'Could not submit. Try again.');
    }
  }

  // ---------- pick ----------
  if (step === 'pick') {
    const open = (commitments.data ?? []).filter((c) => !c.keptToday);
    return (
      <Screen edges={['top', 'bottom']} background={colors.ink}>
        <View style={styles.darkHead}>
          <KText variant="label" color={colors.lime}>
            PROVE IT
          </KText>
          <KText variant="hero" color={colors.bone} style={{ marginTop: spacing.sm }}>
            What did you keep?
          </KText>
        </View>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          {commitments.isPending ? (
            <Loading />
          ) : open.length === 0 ? (
            <EmptyState
              title="All kept. Legendary."
              body="Nothing left to prove today."
            />
          ) : (
            open.map((c, i) => (
              <React.Fragment key={c.id}>
                {i > 0 ? <View style={styles.darkDivider} /> : null}
                <Pressable
                  onPress={() => pick(c)}
                  style={({ pressed }) => [styles.pickRow, pressed && { opacity: 0.6 }]}
                  accessibilityRole="button"
                  accessibilityLabel={`Keep ${c.commitment.name}`}
                >
                  <KText variant="title" color={colors.bone} style={{ fontSize: 34 }}>
                    {c.commitment.name}
                  </KText>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                    <KText variant="small" color={colors.inkFaint}>
                      +{c.points}
                    </KText>
                    <Ionicons name="arrow-forward" size={20} color={colors.lime} />
                  </View>
                </Pressable>
              </React.Fragment>
            ))
          )}
        </View>
        <Pressable onPress={close} style={styles.cancelBtn} accessibilityLabel="Cancel">
          <KText variant="label" color={colors.inkFaint}>
            CANCEL
          </KText>
        </Pressable>
      </Screen>
    );
  }

  // ---------- capture ----------
  if (step === 'capture') {
    const canSkipPhoto = selected && !selected.commitment.proofRequired;
    return (
      <View style={styles.captureRoot}>
        {Platform.OS !== 'web' && permission?.granted ? (
          <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.ink, justifyContent: 'center', alignItems: 'center' }]}>
            <Ionicons name="camera-outline" size={48} color={colors.inkFaint} />
            <KText variant="small" color={colors.inkFaint} style={{ marginTop: spacing.md, textAlign: 'center', paddingHorizontal: spacing.xxl }}>
              {Platform.OS === 'web'
                ? 'Camera is unavailable here — pick a photo instead.'
                : 'Camera permission needed for proof.'}
            </KText>
            {Platform.OS !== 'web' && !permission?.granted ? (
              <Button label="ALLOW CAMERA" variant="lime" onPress={() => void requestPermission()} style={{ marginTop: spacing.lg, alignSelf: 'center' }} />
            ) : null}
          </View>
        )}

        <View style={styles.captureTop}>
          <Pressable onPress={() => setStep('pick')} hitSlop={12} accessibilityLabel="Back">
            <Ionicons name="chevron-down" size={28} color={colors.bone} />
          </Pressable>
          <KText variant="label" color={colors.bone}>
            {selected?.commitment.name ?? 'PROOF'}
          </KText>
          <View style={{ width: 28 }} />
        </View>

        <View style={styles.captureBottom}>
          <Pressable onPress={fromLibrary} hitSlop={10} accessibilityLabel="Choose from library">
            <Ionicons name="images-outline" size={26} color={colors.bone} />
          </Pressable>
          <Pressable
            onPress={fromCamera}
            style={styles.shutter}
            accessibilityRole="button"
            accessibilityLabel="Take photo"
          >
            <View style={styles.shutterInner} />
          </Pressable>
          {canSkipPhoto ? (
            <Pressable onPress={() => setStep('review')} hitSlop={10} accessibilityLabel="Skip photo">
              <KText variant="labelSmall" color={colors.bone}>
                SKIP
              </KText>
            </Pressable>
          ) : (
            <View style={{ width: 26 }} />
          )}
        </View>
      </View>
    );
  }

  // ---------- review ----------
  if (step === 'review') {
    return (
      <Screen edges={['top', 'bottom']} background={colors.ink}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.darkHead}>
            <KText variant="label" color={colors.lime}>
              RECEIPT
            </KText>
            <KText variant="title" color={colors.bone} style={{ marginTop: spacing.sm }}>
              {selected?.commitment.name}
            </KText>
          </View>
          {photo ? (
            <Image source={{ uri: photo }} style={styles.preview} contentFit="cover" />
          ) : null}
          <TextInput
            value={caption}
            onChangeText={setCaption}
            placeholder="caption (optional)"
            placeholderTextColor={colors.inkFaint}
            maxLength={140}
            style={styles.captionInput}
            accessibilityLabel="Caption"
          />
          {error ? <KText variant="small" color={colors.danger}>{error}</KText> : null}
          <View style={{ marginTop: 'auto', gap: spacing.md }}>
            <Button label="KEEP IT" variant="lime" onPress={submitKeep} loading={submit.isPending} />
            <Pressable onPress={() => setStep('capture')} style={{ alignSelf: 'center' }} accessibilityLabel="Retake">
              <KText variant="small" color={colors.inkFaint}>
                retake
              </KText>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Screen>
    );
  }

  // ---------- done ----------
  return (
    <View style={[styles.doneRoot, { backgroundColor: colors.ink }]}>
      <Animated.View style={{ alignItems: 'center', transform: [{ scale }], opacity }}>
        <View style={styles.doneBadge}>
          <Ionicons name="checkmark" size={40} color={colors.ink} />
        </View>
        <KText variant="display" color={colors.bone} style={{ marginTop: spacing.xl }}>
          KEPT.
        </KText>
        {result && result.streak > 1 ? (
          <View style={styles.doneStreak}>
            <Ionicons name="flame" size={16} color={colors.ink} />
            <KText variant="label" color={colors.ink}>
              {result.streak} DAY STREAK
            </KText>
          </View>
        ) : null}
        <KText variant="hero" color={colors.lime} style={{ marginTop: spacing.lg }}>
          +{result?.points ?? 0}
        </KText>
      </Animated.View>
      <View style={styles.doneBtns}>
        <Button label="BACK TO IT" variant="lime" onPress={close} />
        <Pressable
          onPress={() => {
            setPhoto(null);
            setCaption('');
            setResult(null);
            setPickedCommitment(null);
            setStep('pick');
          }}
          accessibilityLabel="Keep another"
        >
          <KText variant="small" color={colors.inkFaint} style={{ textAlign: 'center' }}>
            keep another
          </KText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  darkHead: { paddingTop: spacing.lg },
  darkDivider: { height: 1, backgroundColor: 'rgba(244,241,234,0.15)' },
  pickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.lg,
  },
  cancelBtn: { alignSelf: 'center', paddingVertical: spacing.lg },
  captureRoot: { flex: 1, backgroundColor: colors.ink },
  captureTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxxl,
  },
  captureBottom: {
    position: 'absolute',
    bottom: spacing.xxxl,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  shutter: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 4,
    borderColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.lime,
  },
  preview: {
    width: '100%',
    aspectRatio: 4 / 5,
    borderRadius: radius.lg,
    marginTop: spacing.xl,
    backgroundColor: colors.boneDeep,
  },
  captionInput: {
    height: 52,
    borderRadius: radius.md,
    backgroundColor: 'rgba(244,241,234,0.08)',
    paddingHorizontal: spacing.lg,
    fontFamily: 'Archivo_500Medium',
    fontSize: 15,
    color: colors.bone,
    marginTop: spacing.md,
  },
  doneRoot: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  doneBadge: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneStreak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.lime,
    borderRadius: 999,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginTop: spacing.lg,
  },
  doneBtns: {
    position: 'absolute',
    bottom: spacing.xxxl,
    left: spacing.xl,
    right: spacing.xl,
    gap: spacing.lg,
  },
});
