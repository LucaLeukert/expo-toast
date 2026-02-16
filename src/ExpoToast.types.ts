export type ToastId = string;

export type ToastVariant = 'success' | 'error' | 'info' | 'loading';
export type ToastPosition = 'top' | 'bottom';
export type ToastSize = 'fit-content' | 'fill-width';
export type ToastDuration = number | 'short' | 'long' | 'infinite';
export type ToastDismissReason = 'timeout' | 'swipe' | 'programmatic' | 'replaced';

export type ToastShowEvent = {
  id: ToastId;
};

export type ToastDismissEvent = {
  id: ToastId;
  reason: ToastDismissReason;
};

export type ToastActionPressEvent = {
  id: ToastId;
};

export type ExpoToastModuleEvents = {
  onToastShow: (event: ToastShowEvent) => void;
  onToastDismiss: (event: ToastDismissEvent) => void;
  onToastActionPress: (event: ToastActionPressEvent) => void;
};

export interface ToastAction {
  label: string;
  onPress?: () => void;
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
  onDismiss?: (event: ToastDismissEvent) => void;
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
};
