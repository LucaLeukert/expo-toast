export type ToastId = string;

export type ToastVariant = 'success' | 'error' | 'info' | 'loading';
export type ToastPosition = 'top' | 'bottom';
export type ToastSize = 'fit-content' | 'fill-width';
export type ToastDuration = number | 'short' | 'long' | 'infinite';
export type ToastDismissReason = 'timeout' | 'swipe' | 'programmatic' | 'replaced';
export type ToastImportance = 'low' | 'normal' | 'high';
export type ToastMotionPreference = 'system' | 'full' | 'minimal';
export type ToastDropPolicy = 'oldest' | 'newest';

export type ToastShowEvent = {
  id: ToastId;
};

export type ToastDismissEvent = {
  id: ToastId;
  reason: ToastDismissReason;
};

export type ToastActionPressEvent = {
  id: ToastId;
  variant: ToastVariant;
  title: string | null;
  message: string;
  position: ToastPosition;
};

export type ExpoToastModuleEvents = {
  onToastShow: (event: ToastShowEvent) => void;
  onToastDismiss: (event: ToastDismissEvent) => void;
  onToastActionPress: (event: ToastActionPressEvent) => void;
};

export interface ToastAction {
  label: string;
  onPress?: (event: ToastActionPressEvent) => void;
}

export interface ToastOptions {
  id?: ToastId;
  variant?: ToastVariant;
  title?: string;
  message: string;
  action?: ToastAction;
  duration?: ToastDuration;
  position?: ToastPosition;
  size?: ToastSize;
  haptics?: boolean;
  dedupeKey?: string;
  accessibilityLabel?: string;
  announce?: boolean;
  importance?: ToastImportance;
  motion?: ToastMotionPreference;
  onShow?: (event: ToastShowEvent) => void;
  onDismiss?: (event: ToastDismissEvent) => void;
}

export type ToastMessageOptions = Omit<ToastOptions, 'message' | 'variant'>;

export interface ToastTransitionOptions {
  variant?: ToastVariant;
  title?: string;
  message?: string;
  action?: ToastAction | null;
  duration?: ToastDuration;
  size?: ToastSize;
  haptics?: boolean;
  accessibilityLabel?: string;
  announce?: boolean;
  importance?: ToastImportance;
  motion?: ToastMotionPreference;
  onDismiss?: (event: ToastDismissEvent) => void;
}

export interface ToastConfig {
  duration?: ToastDuration;
  position?: ToastPosition;
  size?: ToastSize;
  haptics?: boolean;
  announce?: boolean;
  importance?: ToastImportance;
  motion?: ToastMotionPreference;
  dedupeWindowMs?: number;
  maxVisible?: number;
  maxQueue?: number;
  dropPolicy?: ToastDropPolicy;
}

export interface ToastPromiseMessages<T> {
  loading: string;
  success: string | ((value: T) => string);
  error: string | ((error: unknown) => string);
}

export interface ToastPromiseOptions {
  loading?: ToastMessageOptions;
  success?: ToastMessageOptions;
  error?: ToastMessageOptions;
}

export type NativeToastPayload = {
  id: ToastId;
  variant: ToastVariant;
  title: string | null;
  message: string;
  actionLabel: string | null;
  durationMs: number;
  position: ToastPosition;
  size: ToastSize;
  haptics: boolean;
  accessibilityLabel: string | null;
  announce: boolean;
  importance: ToastImportance;
  reducedMotion: boolean;
};

export type NativeToastTransitionPayload = {
  id: ToastId;
  variant?: ToastVariant;
  title?: string | null;
  message?: string;
  actionLabel?: string | null;
  clearTitle?: boolean;
  clearAction?: boolean;
  durationMs?: number;
  size?: ToastSize;
  haptics?: boolean;
  accessibilityLabel?: string | null;
  announce?: boolean;
  importance?: ToastImportance;
  reducedMotion?: boolean;
};

export type NativeToastQueueConfig = {
  maxVisible: number;
  maxQueue: number;
  dropPolicy: ToastDropPolicy;
};
