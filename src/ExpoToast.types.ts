/**
 * Unique identifier for a toast instance.
 */
export type ToastId = string;

/**
 * Visual style preset for a toast.
 */
export type ToastVariant = 'success' | 'error' | 'info' | 'loading';
/**
 * Screen edge where a toast stack is rendered.
 */
export type ToastPosition = 'top' | 'bottom';
/**
 * Width behavior for a toast.
 */
export type ToastSize = 'fit-content' | 'fill-width';
/**
 * Display duration in milliseconds or a semantic preset.
 */
export type ToastDuration = number | 'short' | 'long' | 'infinite';
/**
 * Reason the toast left the screen.
 */
export type ToastDismissReason = 'timeout' | 'swipe' | 'programmatic' | 'replaced';
/**
 * Accessibility/announcement priority for a toast.
 */
export type ToastImportance = 'low' | 'normal' | 'high';
/**
 * Motion behavior preference.
 */
export type ToastMotionPreference = 'system' | 'full' | 'minimal';
/**
 * Queue eviction strategy when pending queue capacity is reached.
 */
export type ToastDropPolicy = 'oldest' | 'newest';

/**
 * Event emitted when a toast is presented.
 */
export type ToastShowEvent = {
  id: ToastId;
};

/**
 * Event emitted when a toast is dismissed.
 */
export type ToastDismissEvent = {
  id: ToastId;
  reason: ToastDismissReason;
};

/**
 * Event emitted when a toast action button is pressed.
 */
export type ToastActionPressEvent = {
  id: ToastId;
  variant: ToastVariant;
  title: string | null;
  message: string;
  position: ToastPosition;
};

/**
 * Native module event callbacks exposed by `expo-toast`.
 */
export type ExpoToastModuleEvents = {
  onToastShow: (event: ToastShowEvent) => void;
  onToastDismiss: (event: ToastDismissEvent) => void;
  onToastActionPress: (event: ToastActionPressEvent) => void;
};

/**
 * Action button configuration for a toast.
 */
export interface ToastAction {
  /**
   * Action button label.
   */
  label: string;
  /**
   * Handler called when the action button is pressed.
   */
  onPress?: (event: ToastActionPressEvent) => void;
}

/**
 * Full options used when showing a toast.
 */
export interface ToastOptions {
  /**
   * Explicit id to use for the toast. If omitted, an id is generated.
   */
  id?: ToastId;
  /**
   * Visual style preset. Defaults to `'info'`.
   */
  variant?: ToastVariant;
  /**
   * Optional title text shown above `message`.
   */
  title?: string;
  /**
   * Main toast body text.
   */
  message: string;
  /**
   * Optional action button.
   */
  action?: ToastAction;
  /**
   * Display duration in milliseconds or semantic preset.
   */
  duration?: ToastDuration;
  /**
   * Screen edge used for rendering. Falls back to global config.
   */
  position?: ToastPosition;
  /**
   * Width behavior for this toast. Falls back to global config.
   */
  size?: ToastSize;
  /**
   * Enables haptic feedback when showing the toast.
   */
  haptics?: boolean;
  /**
   * Key used for dedupe matching within `dedupeWindowMs`.
   */
  dedupeKey?: string;
  /**
   * Accessibility label override announced by assistive technologies.
   */
  accessibilityLabel?: string;
  /**
   * Whether this toast should trigger an accessibility announcement.
   */
  announce?: boolean;
  /**
   * Accessibility importance for announcement behavior.
   */
  importance?: ToastImportance;
  /**
   * Motion behavior override for this toast.
   */
  motion?: ToastMotionPreference;
  /**
   * Called when the toast is shown.
   */
  onShow?: (event: ToastShowEvent) => void;
  /**
   * Called when the toast is dismissed.
   */
  onDismiss?: (event: ToastDismissEvent) => void;
}

/**
 * Shared toast options for convenience APIs that provide message/variant separately.
 */
export type ToastMessageOptions = Omit<ToastOptions, 'message' | 'variant'>;

/**
 * Options used to update an existing toast.
 */
export interface ToastTransitionOptions {
  /**
   * New variant to apply.
   */
  variant?: ToastVariant;
  /**
   * New title text.
   */
  title?: string;
  /**
   * New body text.
   */
  message?: string;
  /**
   * Action button update.
   * Use `null` to clear the current action.
   */
  action?: ToastAction | null;
  /**
   * New duration in milliseconds or semantic preset.
   */
  duration?: ToastDuration;
  /**
   * New width behavior.
   */
  size?: ToastSize;
  /**
   * Haptics override for this transition.
   */
  haptics?: boolean;
  /**
   * Accessibility label override.
   */
  accessibilityLabel?: string;
  /**
   * Announcement behavior override.
   */
  announce?: boolean;
  /**
   * Accessibility importance override.
   */
  importance?: ToastImportance;
  /**
   * Motion behavior override.
   */
  motion?: ToastMotionPreference;
  /**
   * Dismiss callback replacement for this toast id.
   */
  onDismiss?: (event: ToastDismissEvent) => void;
}

/**
 * Global runtime defaults and queue controls.
 */
export interface ToastConfig {
  /**
   * Default duration for new toasts.
   */
  duration?: ToastDuration;
  /**
   * Default render position.
   */
  position?: ToastPosition;
  /**
   * Default width behavior.
   */
  size?: ToastSize;
  /**
   * Default haptics behavior.
   */
  haptics?: boolean;
  /**
   * Default announcement behavior.
   */
  announce?: boolean;
  /**
   * Default accessibility importance.
   */
  importance?: ToastImportance;
  /**
   * Default motion behavior.
   */
  motion?: ToastMotionPreference;
  /**
   * Time window used to dedupe matching toasts in milliseconds.
   */
  dedupeWindowMs?: number;
  /**
   * Maximum simultaneously visible toasts per edge.
   */
  maxVisible?: number;
  /**
   * Maximum queued pending toasts per edge.
   */
  maxQueue?: number;
  /**
   * Queue eviction strategy when `maxQueue` is exceeded.
   */
  dropPolicy?: ToastDropPolicy;
}

/**
 * Text messages used by `toast.promise`.
 */
export interface ToastPromiseMessages<T> {
  /**
   * Message shown while the promise is pending.
   */
  loading: string;
  /**
   * Success message or mapper using the resolved value.
   */
  success: string | ((value: T) => string);
  /**
   * Error message or mapper using the rejection reason.
   */
  error: string | ((error: unknown) => string);
}

/**
 * Optional per-state options for `toast.promise`.
 */
export interface ToastPromiseOptions {
  /**
   * Extra options for the loading toast.
   */
  loading?: ToastMessageOptions;
  /**
   * Extra options for the success transition.
   */
  success?: ToastMessageOptions;
  /**
   * Extra options for the error transition.
   */
  error?: ToastMessageOptions;
}

/**
 * Public imperative API exposed as `toast`.
 */
export interface ToastApi {
  /**
   * Shows a toast with full control over content and behavior.
   */
  show(options: ToastOptions): ToastId;
  /**
   * Transitions an existing toast by id.
   */
  transition(id: ToastId, options: ToastTransitionOptions): ToastId;
  /**
   * Alias for `transition`.
   */
  update(id: ToastId, options: ToastTransitionOptions): ToastId;
  /**
   * Shows a success toast.
   */
  success(message: string, options?: ToastMessageOptions): ToastId;
  /**
   * Shows an error toast.
   */
  error(message: string, options?: ToastMessageOptions): ToastId;
  /**
   * Shows an info toast.
   */
  info(message: string, options?: ToastMessageOptions): ToastId;
  /**
   * Shows a loading toast.
   */
  loading(message: string, options?: ToastMessageOptions): ToastId;
  /**
   * Binds toast state to a promise lifecycle.
   */
  promise<T>(
    work: Promise<T>,
    messages: ToastPromiseMessages<T>,
    options?: ToastPromiseOptions,
  ): Promise<T>;
  /**
   * Updates global runtime defaults.
   */
  configure(config: ToastConfig): void;
  /**
   * Dismisses one toast by id, or all toasts when id is omitted.
   */
  dismiss(id?: ToastId): void;
  /**
   * Dismisses all visible and queued toasts.
   */
  dismissAll(): void;
  /**
   * Returns whether native runtime support is currently available.
   */
  isSupported(): boolean;
}

/**
 * Native payload used internally for show operations.
 */
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

/**
 * Native payload used internally for toast transitions.
 */
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

/**
 * Native queue configuration payload.
 */
export type NativeToastQueueConfig = {
  maxVisible: number;
  maxQueue: number;
  dropPolicy: ToastDropPolicy;
};
