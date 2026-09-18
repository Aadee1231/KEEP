import React from 'react';
import { Text, TextProps, TextStyle } from 'react-native';
import { colors, type } from '../theme';

type Props = TextProps & {
  variant?: keyof typeof type;
  color?: string;
  style?: TextStyle | TextStyle[];
};

export function KText({ variant = 'body', color = colors.ink, style, ...rest }: Props) {
  return <Text {...rest} style={[type[variant], { color }, style]} />;
}
