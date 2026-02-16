/**
 * Unique identifier for a toast instance.
 *
 * This id is returned by all show-style APIs and can be used later with
 * `ToastApi.transition`, `ToastApi.update`, or `ToastApi.dismiss`.
 * If you do not provide one explicitly in `ToastOptions.id`, the library
 * generates a unique value.
 */
export type ToastId = string;

/**
 * Visual style preset for a toast.
 *
 * - `success`: positive confirmation.
 * - `error`: failure state.
 * - `info`: neutral status update.
 * - `loading`: in-progress state, defaults to an infinite duration until updated/dismissed.
 */
export type ToastVariant = 'success' | 'error' | 'info' | 'loading';
/**
 * Screen edge where a toast stack is rendered.
 *
 * Toast queues are maintained per edge, so `top` and `bottom` are independent
 * visible/pending stacks.
 */
export type ToastPosition = 'top' | 'bottom';
/**
 * Width behavior for a toast.
 *
 * - `fit-content`: width grows to content with system-defined bounds.
 * - `fill-width`: toast stretches to the available horizontal safe area.
 */
export type ToastSize = 'fit-content' | 'fill-width';
/**
 * Display duration in milliseconds or a semantic preset.
 *
 * Presets are converted by `normalizeDuration`:
 * - `short` => `2000ms`
 * - `long` => `4500ms`
 * - `infinite` => never auto-dismisses
 *
 * Numeric values are rounded to integers and clamped to `>= 0`.
 */
export type ToastDuration = number | 'short' | 'long' | 'infinite';
/**
 * Reason the toast left the screen.
 *
 * - `timeout`: auto-dismiss after duration elapsed.
 * - `swipe`: user dismissed with a gesture.
 * - `programmatic`: dismissed via API (`dismiss` / `dismissAll`).
 * - `replaced`: toast was replaced by transition or queue behavior.
 */
export type ToastDismissReason = 'timeout' | 'swipe' | 'programmatic' | 'replaced';
/**
 * Accessibility/announcement priority for a toast.
 *
 * Importance controls announcement behavior defaults and ordering hints passed
 * to native accessibility APIs.
 */
export type ToastImportance = 'low' | 'normal' | 'high';
/**
 * Motion behavior preference.
 *
 * - `system`: follows the OS "Reduce Motion" setting.
 * - `full`: always uses full animation.
 * - `minimal`: uses reduced-motion transitions regardless of OS setting.
 */
export type ToastMotionPreference = 'system' | 'full' | 'minimal';
/**
 * Queue eviction strategy when pending queue capacity is reached.
 *
 * - `oldest`: remove the oldest pending toast and enqueue the new one.
 * - `newest`: discard the newly requested toast when the queue is full.
 */
export type ToastDropPolicy = 'oldest' | 'newest';

/**
 * Event emitted when a toast is presented.
 *
 * Triggered once the native presenter has accepted and displayed the toast.
 */
export type ToastShowEvent = {
  id: ToastId;
};

/**
 * Event emitted when a toast is dismissed.
 *
 * Dismiss callbacks receive this payload to identify which toast ended and why.
 */
export type ToastDismissEvent = {
  id: ToastId;
  reason: ToastDismissReason;
};

/**
 * Event emitted when a toast action button is pressed.
 *
 * Includes the id and resolved metadata of the toast at the moment the action
 * was invoked.
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
 *
 * These are internal event channels consumed by the JS runtime wrapper and are
 * not subscribed directly in normal app usage.
 */
export type ExpoToastModuleEvents = {
  onToastShow: (event: ToastShowEvent) => void;
  onToastDismiss: (event: ToastDismissEvent) => void;
  onToastActionPress: (event: ToastActionPressEvent) => void;
};

/**
 * Action button configuration for a toast.
 *
 * Exactly one action is supported per toast.
 */
export interface ToastAction {
  /**
   * Action button label shown in the trailing action area.
   */
  label: string;
  /**
   * Handler called when the action button is pressed.
   *
   * This callback is optional. If omitted, the button still renders but does
   * not invoke custom JS behavior.
   */
  onPress?: (event: ToastActionPressEvent) => void;
}

/**
 * Full options used when showing a toast.
 *
 * This is the most complete shape accepted by `ToastApi.show`.
 */
export interface ToastOptions {
  /**
   * Explicit id to use for the toast.
   *
   * If omitted, an id is generated. Reusing ids intentionally can simplify
   * update flows, but you should avoid accidental collisions.
   */
  id?: ToastId;
  /**
   * Visual style preset.
   *
   * Defaults to `'info'`.
   */
  variant?: ToastVariant;
  /**
   * Optional title text shown above `ToastOptions.message`.
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
   *
   * If omitted, the global config duration is used. If both are omitted:
   * `loading` defaults to infinite and other variants default to `3000ms`.
   */
  duration?: ToastDuration;
  /**
   * Screen edge used for rendering.
   *
   * Falls back to the current global config position.
   */
  position?: ToastPosition;
  /**
   * Width behavior for this toast.
   *
   * Falls back to the current global config size.
   */
  size?: ToastSize;
  /**
   * Enables haptic feedback when showing the toast.
   */
  haptics?: boolean;
  /**
   * Key used for dedupe matching within the active `dedupeWindowMs`.
   *
   * If omitted, the message text is used as the dedupe key.
   */
  dedupeKey?: string;
  /**
   * Accessibility label override announced by assistive technologies.
   */
  accessibilityLabel?: string;
  /**
   * Whether this toast should trigger an accessibility announcement.
   *
   * If omitted, defaults are derived from `importance` and global config.
   */
  announce?: boolean;
  /**
   * Accessibility importance for announcement behavior and native hinting.
   */
  importance?: ToastImportance;
  /**
   * Motion behavior override for this toast.
   */
  motion?: ToastMotionPreference;
  /**
   * Called when the toast is shown.
   *
   * This callback is associated with this toast id only.
   */
  onShow?: (event: ToastShowEvent) => void;
  /**
   * Called when the toast is dismissed.
   *
   * Fires for timeout, gesture, programmatic dismissal, and replacement cases.
   */
  onDismiss?: (event: ToastDismissEvent) => void;
}

/**
 * Shared toast options for convenience APIs that provide message/variant separately.
 *
 * Used by `toast.success`, `toast.error`, `toast.info`, and `toast.loading`.
 */
export type ToastMessageOptions = Omit<ToastOptions, 'message' | 'variant'>;

/**
 * Options used to update an existing toast.
 *
 * All fields are optional and only provided keys are changed.
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
   *
   * - `undefined`: keep current action.
   * - `null`: clear current action.
   * - `ToastAction`: replace current action.
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
   *
   * If omitted, the previous callback is retained.
   */
  onDismiss?: (event: ToastDismissEvent) => void;
}

/**
 * Global runtime defaults and queue controls.
 *
 * Applied through `ToastApi.configure`. Calling configure merges values
 * into the current runtime config; omitted fields keep their previous values.
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
   *
   * `0` disables dedupe. Values are rounded and clamped to `>= 0`.
   */
  dedupeWindowMs?: number;
  /**
   * Maximum simultaneously visible toasts per edge.
   */
  maxVisible?: number;
  /**
   * Maximum queued pending toasts per edge.
   *
   * `0` disables queuing entirely.
   */
  maxQueue?: number;
  /**
   * Queue eviction strategy when `maxQueue` is exceeded.
   */
  dropPolicy?: ToastDropPolicy;
}

/**
 * Text messages used by `ToastApi.promise`.
 */
export interface ToastPromiseMessages<T> {
  /**
   * Message shown while the promise is pending.
   */
  loading: string;
  /**
   * Success message or mapper using the resolved value.
   *
   * The function form lets you generate context-aware success text.
   */
  success: string | ((value: T) => string);
  /**
   * Error message or mapper using the rejection reason.
   *
   * The function form receives the original rejection value.
   */
  error: string | ((error: unknown) => string);
}

/**
 * Optional per-state options for `ToastApi.promise`.
 *
 * These options are merged into each corresponding lifecycle toast.
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
   *
   * Returns the active toast id. On unsupported runtimes, this is a safe no-op
   * and still returns a deterministic id.
   */
  show(options: ToastOptions): ToastId;
  /**
   * Transitions an existing toast by id.
   *
   * Use to update content, variant, duration, action, or accessibility settings
   * of a toast that is currently visible or queued.
   */
  transition(id: ToastId, options: ToastTransitionOptions): ToastId;
  /**
   * Alias for `ToastApi.transition`.
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
   *
   * Shows a loading toast immediately, then transitions it to success or error
   * based on the promise result, returning the original promise outcome.
   */
  promise<T>(
    work: Promise<T>,
    messages: ToastPromiseMessages<T>,
    options?: ToastPromiseOptions,
  ): Promise<T>;
  /**
   * Updates global runtime defaults.
   *
   * This call is additive: only provided keys are changed.
   */
  configure(config: ToastConfig): void;
  /**
   * Dismisses one toast by id, or all toasts when id is omitted.
   *
   * When no id is passed, behavior matches `ToastApi.dismissAll`.
   */
  dismiss(id?: ToastId): void;
  /**
   * Dismisses all visible and queued toasts.
   */
  dismissAll(): void;
  /**
   * Returns whether native runtime support is currently available.
   *
   * In this version, support is available on iOS native runtimes with the
   * module linked into the app binary. Android and web return `false`.
   */
  isSupported(): boolean;
}

/**
 * Native payload used internally for show operations.
 *
 * This type is not intended for direct app usage.
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
 *
 * This type is not intended for direct app usage.
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
 *
 * This type is not intended for direct app usage.
 */
export type NativeToastQueueConfig = {
  maxVisible: number;
  maxQueue: number;
  dropPolicy: ToastDropPolicy;
};
