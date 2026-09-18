import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

type Strength = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'selection';

export function haptic(strength: Strength = 'medium') {
  if (Platform.OS === 'web') return;
  switch (strength) {
    case 'light':
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      break;
    case 'medium':
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      break;
    case 'heavy':
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      break;
    case 'success':
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      break;
    case 'warning':
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      break;
    case 'selection':
      void Haptics.selectionAsync();
      break;
  }
}
