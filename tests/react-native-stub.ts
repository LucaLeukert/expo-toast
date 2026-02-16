export const Platform = {
  OS: 'ios',
  Version: '26.0',
};

let reduceMotionEnabled = false;
let listener: ((value: boolean) => void) | null = null;

export const AccessibilityInfo = {
  async isReduceMotionEnabled() {
    return reduceMotionEnabled;
  },
  addEventListener(_eventName: string, callback: (value: boolean) => void) {
    listener = callback;
    return {
      remove() {
        listener = null;
      },
    };
  },
};

export function __setReduceMotionEnabled(value: boolean): void {
  reduceMotionEnabled = value;
  listener?.(value);
}
