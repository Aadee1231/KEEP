// KEEP design tokens — editorial, minimal, warm.
export const colors = {
  bone: '#F4F1EA', // app background
  boneDeep: '#EBE7DD', // recessed surfaces / inputs
  paper: '#FBFAF6', // raised surfaces
  ink: '#141310', // near-black
  inkSoft: '#5C584F', // secondary text
  inkFaint: '#9A958A', // tertiary text
  line: '#E0DBD0', // hairlines
  lime: '#D8FF3E', // electric accent
  limeDeep: '#B8DD14',
  danger: '#D64541',
  white: '#FFFFFF',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
} as const;

export const fonts = {
  regular: 'Archivo_400Regular',
  medium: 'Archivo_500Medium',
  semibold: 'Archivo_600SemiBold',
  bold: 'Archivo_700Bold',
  black: 'Archivo_900Black',
} as const;

type Variant = {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing?: number;
  textTransform?: 'uppercase' | 'none';
};

export const type: Record<string, Variant> = {
  display: { fontFamily: fonts.black, fontSize: 52, lineHeight: 50, letterSpacing: -1.5 },
  hero: { fontFamily: fonts.black, fontSize: 40, lineHeight: 40, letterSpacing: -1 },
  title: { fontFamily: fonts.black, fontSize: 30, lineHeight: 32, letterSpacing: -0.8 },
  heading: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 26, letterSpacing: -0.4 },
  subhead: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 22, letterSpacing: -0.2 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 22 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22 },
  small: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 19 },
  smallStrong: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 19 },
  caption: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16 },
  label: {
    fontFamily: fonts.bold,
    fontSize: 12,
    lineHeight: 14,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  labelSmall: {
    fontFamily: fonts.bold,
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  stat: { fontFamily: fonts.black, fontSize: 26, lineHeight: 28, letterSpacing: -0.6 },
  mono: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 18, letterSpacing: 0.5 },
} as const;

export const hitSlop = { top: 10, bottom: 10, left: 10, right: 10 };
