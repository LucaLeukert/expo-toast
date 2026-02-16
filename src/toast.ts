import { Platform } from 'react-native';
import type {
  ToastDismissEvent,
  ToastDuration,
  ToastId,
  ToastMessageOptions,
  ToastOptions,
  ToastShowEvent,
  ToastTransitionOptions,
  ToastVariant,
} from './ExpoToast.types';
import ExpoToastModule from './ExpoToastModule';

const SHORT_MS = 2000;
const DEFAULT_MS = 3000;
const LONG_MS = 4500;
const INFINITE_MS = -1;

let hasWarnedUnsupported = false;
let idCounter = 0;

const callbacks = new Map<
  ToastId,
  {
    onShow?: (event: ToastShowEvent) => void;
    onDismiss?: (event: ToastDismissEvent) => void;
    onAction?: () => void;
  }
>();

let listenersInitialized = false;

export function parseIOSMajorVersion(version: string | number): number {
  if (typeof version === 'number') {
    return Math.trunc(version);
  }

  const major = Number.parseInt(version.split('.')[0] ?? '', 10);
  return Number.isFinite(major) ? major : 0;
}

export function runtimeSupportsToastFor(os: string, version: string | number): boolean {
  return os === 'ios' && parseIOSMajorVersion(version) >= 26;
}

function runtimeSupportsToast(): boolean {
  return runtimeSupportsToastFor(Platform.OS, Platform.Version);
}

function warnUnsupportedOnce(): void {
  if (!__DEV__ || hasWarnedUnsupported) {
    return;
  }
  hasWarnedUnsupported = true;
  console.warn(
    '[expo-toast] Unsupported platform. Toast calls are no-op unless running on iOS 26+.',
  );
}

function ensureListeners(): void {
  if (listenersInitialized) {
    return;
  }
  listenersInitialized = true;

  ExpoToastModule.addListener('onToastShow', (event) => {
    const entry = callbacks.get(event.id);
    entry?.onShow?.(event);
  });

  ExpoToastModule.addListener('onToastDismiss', (event) => {
    const entry = callbacks.get(event.id);
    entry?.onDismiss?.(event);
    callbacks.delete(event.id);
  });

  ExpoToastModule.addListener('onToastActionPress', (event) => {
    const entry = callbacks.get(event.id);
    entry?.onAction?.();
  });
}

function nextToastId(): ToastId {
  idCounter += 1;
  return `toast_${Date.now()}_${idCounter}`;
}

export function normalizeDuration(
  duration: ToastDuration | undefined,
  variant: ToastVariant,
): number {
  if (duration === undefined) {
    return variant === 'loading' ? INFINITE_MS : DEFAULT_MS;
  }
  if (typeof duration === 'number') {
    return Math.max(0, Math.round(duration));
  }
  if (duration === 'short') {
    return SHORT_MS;
  }
  if (duration === 'long') {
    return LONG_MS;
  }
  return INFINITE_MS;
}

function show(options: ToastOptions): ToastId {
  const id = options.id ?? nextToastId();
  const variant = options.variant ?? 'info';

  if (!runtimeSupportsToast() || !ExpoToastModule.isSupported()) {
    warnUnsupportedOnce();
    return id;
  }

  ensureListeners();

  callbacks.set(id, {
    onShow: options.onShow,
    onDismiss: options.onDismiss,
    onAction: options.action?.onPress,
  });

  ExpoToastModule.show({
    id,
    variant,
    title: options.title ?? null,
    message: options.message,
    actionLabel: options.action?.label ?? null,
    durationMs: normalizeDuration(options.duration, variant),
    position: options.position ?? 'top',
    size: options.size ?? 'fit-content',
    haptics: options.haptics ?? true,
  });

  return id;
}

function transition(id: ToastId, options: ToastTransitionOptions): ToastId {
  if (!runtimeSupportsToast() || !ExpoToastModule.isSupported()) {
    warnUnsupportedOnce();
    return id;
  }

  ensureListeners();

  const current = callbacks.get(id) ?? {};
  callbacks.set(id, {
    onShow: current.onShow,
    onDismiss: options.onDismiss ?? current.onDismiss,
    onAction: options.action === null ? undefined : (options.action?.onPress ?? current.onAction),
  });

  const actionLabel =
    options.action === undefined
      ? undefined
      : options.action === null
        ? null
        : options.action.label;

  ExpoToastModule.transition({
    id,
    variant: options.variant,
    title: options.title ?? undefined,
    message: options.message,
    actionLabel,
    clearAction: options.action === null,
    durationMs:
      options.duration === undefined
        ? undefined
        : normalizeDuration(options.duration, options.variant ?? 'info'),
    size: options.size,
    haptics: options.haptics,
  });

  return id;
}

function withVariant(
  variant: ToastVariant,
  message: string,
  options?: ToastMessageOptions,
): ToastId {
  return show({
    ...(options ?? {}),
    variant,
    message,
  });
}

function dismiss(id?: ToastId): void {
  if (!runtimeSupportsToast() || !ExpoToastModule.isSupported()) {
    warnUnsupportedOnce();
    if (id) {
      callbacks.delete(id);
    }
    return;
  }
  ExpoToastModule.dismiss(id);
}

function dismissAll(): void {
  if (!runtimeSupportsToast() || !ExpoToastModule.isSupported()) {
    warnUnsupportedOnce();
    callbacks.clear();
    return;
  }
  ExpoToastModule.dismissAll();
}

function isSupported(): boolean {
  if (!runtimeSupportsToast()) {
    return false;
  }
  return ExpoToastModule.isSupported();
}

export const toast = {
  show,
  transition,
  success(message: string, options?: ToastMessageOptions): ToastId {
    return withVariant('success', message, options);
  },
  error(message: string, options?: ToastMessageOptions): ToastId {
    return withVariant('error', message, options);
  },
  info(message: string, options?: ToastMessageOptions): ToastId {
    return withVariant('info', message, options);
  },
  loading(message: string, options?: ToastMessageOptions): ToastId {
    return withVariant('loading', message, options);
  },
  dismiss,
  dismissAll,
  isSupported,
};
