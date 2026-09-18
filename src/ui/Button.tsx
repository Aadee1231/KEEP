import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { colors, radius, spacing } from '../theme';
import { haptic } from '../lib/haptics';
import { KText } from './KText';

type Variant = 'primary' | 'lime' | 'ghost' | 'outline' | 'danger';

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  accessibilityLabel?: string;
};

const bg: Record<Variant, string> = {
  primary: colors.ink,
  lime: colors.lime,
  ghost: 'transparent',
  outline: 'transparent',
  danger: colors.danger,
};

const fg: Record<Variant, string> = {
  primary: colors.bone,
  lime: colors.ink,
  ghost: colors.ink,
  outline: colors.ink,
  danger: colors.white,
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  icon,
  style,
  accessibilityLabel,
}: Props) {
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: inactive }}
      disabled={inactive}
      onPress={() => {
        haptic('medium');
        onPress();
      }}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: bg[variant] },
        variant === 'outline' && styles.outline,
        pressed && !inactive && styles.pressed,
        inactive && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg[variant]} size="small" />
      ) : (
        <>
          {icon}
          <KText variant="bodyStrong" color={fg[variant]}>
            {label}
          </KText>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 54,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  outline: {
    borderWidth: 1.5,
    borderColor: colors.ink,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.985 }],
  },
  disabled: {
    opacity: 0.35,
  },
});
