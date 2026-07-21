import * as Haptics from 'expo-haptics';

/** Light confirmation for resolve / approve / assign. */
export function hapticConfirm() {
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

/** Softer tap acknowledgement (status step, reopen). */
export function hapticLight() {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

export function hapticWarning() {
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
}
