import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme';

type Props = {
  children: React.ReactNode;
  edges?: Edge[];
  padded?: boolean;
  style?: ViewStyle;
  background?: string;
};

export function Screen({ children, edges = ['top'], padded = true, style, background }: Props) {
  return (
    <SafeAreaView edges={edges} style={[styles.safe, { backgroundColor: background ?? colors.bone }]}>
      <View style={[styles.body, padded && styles.padded, style]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { flex: 1 },
  padded: { paddingHorizontal: spacing.xl },
});
