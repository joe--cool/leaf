export function trackFocusVisible(fn: (visible: boolean) => void) {
  fn(false);
  return () => {};
}

export function trackInteractionModality(fn: (mode: string | null) => void) {
  fn('pointer');
  return () => {};
}

export function getInteractionModality() {
  return 'pointer';
}

export function setInteractionModality() {}
